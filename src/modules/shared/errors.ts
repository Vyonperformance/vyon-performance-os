export function databaseError(error: { code?: string; message: string }) {
  if (error.code === "23505")
    return new Error(
      "Já existe um registro com esses dados (documento, nome ou contato principal).",
    );
  if (error.code === "40001")
    return new Error("Registro alterado por outra pessoa. Atualize a página.");
  if (error.code === "42501") return new Error("Acesso não permitido.");
  if (error.code === "23503" || error.code === "23514")
    return new Error("Dados inválidos ou vínculo não permitido.");
  return new Error("Não foi possível concluir a operação. Tente novamente.");
}
