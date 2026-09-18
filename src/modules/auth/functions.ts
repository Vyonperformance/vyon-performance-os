import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { loginInput } from "../shared/schemas";
import { readSession } from "./service.server";
import { serverSupabase } from "@/lib/supabase/client.server";
export const getSession = createServerFn({ method: "GET" }).handler(() => readSession());
export const signIn = createServerFn({ method: "POST" })
  .inputValidator(loginInput)
  .handler(async ({ data }) => {
    const { error } = await serverSupabase().auth.signInWithPassword(data);
    if (error) throw new Error("Não foi possível entrar. Verifique e-mail e senha.");
    const { error: inviteError } = await serverSupabase().rpc("accept_invitation");
    if (inviteError) throw new Error("Não foi possível verificar o convite.");
    return { ok: true };
  });
export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { error } = await serverSupabase().auth.signOut();
  if (error) throw new Error("Não foi possível encerrar a sessão.");
  return { ok: true };
});
export const exchangeAuthCode = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string().min(1).max(2000) }))
  .handler(async ({ data }) => {
    const { error } = await serverSupabase().auth.exchangeCodeForSession(data.code);
    if (error) throw new Error("Link inválido ou expirado.");
    const { error: inviteError } = await serverSupabase().rpc("accept_invitation");
    if (inviteError) throw new Error("Não foi possível verificar o convite.");
    return { ok: true };
  });
export const updatePassword = createServerFn({ method: "POST" })
  .inputValidator(z.object({ password: z.string().min(12).max(256) }))
  .handler(async ({ data }) => {
    const db = serverSupabase();
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();
    if (authError || !user) throw new Error("Sessão inválida.");
    const { error } = await db.auth.updateUser(data);
    if (error) throw new Error("Não foi possível atualizar a senha.");
    return { ok: true };
  });

export const verifyEmailLink = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ tokenHash: z.string().min(1).max(2000), type: z.enum(["invite", "recovery"]) }),
  )
  .handler(async ({ data }) => {
    const db = serverSupabase();
    const { error } = await db.auth.verifyOtp({ token_hash: data.tokenHash, type: data.type });
    if (error) throw new Error("Link inválido ou expirado.");
    const { error: inviteError } = await db.rpc("accept_invitation");
    if (inviteError) throw new Error("Não foi possível verificar o convite.");
    return { ok: true };
  });
