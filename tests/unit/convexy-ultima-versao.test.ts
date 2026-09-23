import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Convexy: o fork publica versões `vX.Y.Z-cvx.N`. `ultima_versao_publicada`
 * (hostgator-setup-kit/_common.sh) é o que a instalação nova usa para escolher a
 * versão; no original ela descartava QUALQUER hífen e, no fork, instalaria a base
 * sem identidade (que nem tem imagem publicada no GHCR do fork).
 * Registro: CONVEXY.md, "Filtro de versão do kit".
 */

const RAIZ = process.cwd();
// Isola do git config de quem roda: um `versionsort.suffix` global inverteria a ordem.
const ENV_GIT = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };

function repoComTags(tags: string[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cvx-tags-"));
  const git = (...args: string[]) => execFileSync("git", args, { cwd: dir, stdio: "ignore", env: ENV_GIT });
  git("init", "-q");
  git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "--allow-empty", "-m", "base");
  for (const t of tags) git("tag", t);
  return dir;
}

function ultima(dir: string): { saida: string } {
  // stdout do `source` descartado; stderr não — um _common.sh quebrado aparece no log do teste,
  // e o último caso confere que a função existe (o "" não passa pelo motivo errado).
  const r = execFileSync(
    "bash",
    ["-c", 'source hostgator-setup-kit/_common.sh >/dev/null; ultima_versao_publicada "$1"', "teste", `file://${dir}`],
    { cwd: RAIZ, encoding: "utf8", env: ENV_GIT, stdio: ["ignore", "pipe", "inherit"] },
  );
  return { saida: r.trim() };
}

function comRepo(tags: string[], fn: (dir: string) => void) {
  const dir = repoComTags(tags);
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe("ultima_versao_publicada no fork Convexy", () => {
  it("escolhe a maior -cvx.N acima da base", () => {
    comRepo(["v1.44.0", "v1.44.0-cvx.1", "v1.44.0-cvx.2", "v1.44.0-cvx.10"], (dir) => {
      expect(ultima(dir).saida).toBe("1.44.0-cvx.10");
    });
  });

  it("ignora release candidate, alpha, beta, maiúsculas e sufixo depois do -cvx.N", () => {
    comRepo(
      ["v1.44.0", "v1.44.0-cvx.10", "v1.44.0-rc1", "v1.44.0-RC3", "v1.45.0-alpha.1", "v1.45.0-beta.2", "v1.44.0-cvx.10-teste"],
      (dir) => {
        expect(ultima(dir).saida).toBe("1.44.0-cvx.10");
      },
    );
  });

  it("sem -cvx ainda, fica com a base", () => {
    comRepo(["v1.44.0", "v1.44.0-rc1"], (dir) => {
      expect(ultima(dir).saida).toBe("1.44.0");
    });
  });

  it("sem tag nenhuma devolve vazio, e o _common.sh carregou (a função existe)", () => {
    comRepo([], (dir) => {
      expect(ultima(dir).saida).toBe("");
      const tipo = execFileSync(
        "bash",
        ["-c", "source hostgator-setup-kit/_common.sh >/dev/null; type -t ultima_versao_publicada"],
        { cwd: RAIZ, encoding: "utf8" },
      ).trim();
      expect(tipo).toBe("function");
    });
  });
});
