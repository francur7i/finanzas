export async function register() {
  // Solo en el runtime de Node (el de Edge no tiene acceso a la base) y una vez por proceso.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const g = globalThis as unknown as { programadorIniciado?: boolean };
  if (g.programadorIniciado) return;
  g.programadorIniciado = true;

  const { iniciarProgramador } = await import("@/lib/programador");
  iniciarProgramador();
}
