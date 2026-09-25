"use client";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useT } from "@/hooks/i18n/useT";
import { SidebarContent } from "@/components/shell/Sidebar";
import { List } from "@/lib/ui/icons";
// Convexy: a gaveta do menu da Convexy com o módulo ligado — CONVEXY.md, "Menu novo".
import { GavetaConvexy } from "@/components/convexy/menu/GavetaConvexy";
import { useConvexy } from "@/lib/convexy/contexto";

/**
 * Navegação mobile do app autenticado.
 *
 * O estado "Recolher" é do sidebar desktop e persiste em cookie. No mobile a
 * navegação é uma gaveta temporária: abrir/fechar não escreve esse cookie, para
 * não trocar a preferência que a pessoa escolheu no laptop.
 */
export function MobileSidebar() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const convexy = useConvexy();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 md:hidden"
          aria-label={t("Abrir navegação")}
        >
          <List size={22} aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-0 p-0 sm:max-w-xs"
      >
        <SheetTitle className="sr-only">{t("Navegação principal")}</SheetTitle>
        {/* Convexy: a gaveta da Convexy ou a do original, pelo módulo. CONVEXY.md, "Menu novo". */}
        {convexy?.menuLigado ? (
          <GavetaConvexy aoNavegar={() => setOpen(false)} />
        ) : (
          <SidebarContent
            collapsed={false}
            showCollapseControl={false}
            onNavigate={() => setOpen(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
