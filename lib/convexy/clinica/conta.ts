/**
 * Convexy — a CONTA do especialista sem acesso (migration 9008; CONVEXY.md,
 * "Minha clínica"). Módulo sem dependência, para `lib/auth/server.ts` poder
 * recusar a sessão sem puxar a agenda nem as ferramentas da IA.
 */

/** `.invalid` é reservado (RFC 2606): nenhum servidor de e-mail responde por ele. */
export const DOMINIO_DO_ESPECIALISTA = "especialistas.invalid";

/** ~100 anos. O Auth guarda `banned_until`; o especialista nunca abre sessão. */
export const BAN_DO_ESPECIALISTA = "876000h";

export function emailDoEspecialista(chave: string): string {
  return `especialista+${chave}@${DOMINIO_DO_ESPECIALISTA}`;
}

export function ehEmailDeEspecialista(email: string | null | undefined): boolean {
  return typeof email === "string" && email.toLowerCase().endsWith(`@${DOMINIO_DO_ESPECIALISTA}`);
}

/** O cinto de `loadAuthUser`: a conta do especialista não abre sessão nem com o ban retirado. */
export function ehEspecialistaSemAcesso(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): boolean {
  return user.user_metadata?.especialista === true || ehEmailDeEspecialista(user.email);
}
