import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getSession,
  signIn,
  signOut,
  exchangeAuthCode,
  updatePassword,
  verifyEmailLink,
} from "./functions";
import { loginInput } from "../shared/schemas";
import type { TeamMember } from "./types";
import { browserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
const MemberContext = createContext<TeamMember | null>(null);
export function useTeamMember() {
  const member = useContext(MemberContext);
  if (!member) throw new Error("Sessão necessária");
  return member;
}
export function SessionBoundary({ children }: { children: ReactNode }) {
  const q = useQueryClient();
  const [recovery, setRecovery] = useState(false);
  const [callbackError, setCallbackError] = useState("");
  const [exchanging, setExchanging] = useState(false);
  const identity = useRef<string | null>(null);
  const session = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const next = await getSession();
      const key = next.member
        ? `${next.member.userId}:${next.member.organizationId}:${next.member.permissions.join(",")}`
        : null;
      if (identity.current !== key) {
        await q.cancelQueries({ predicate: (x) => x.queryKey[0] === "org" });
        q.removeQueries({ predicate: (x) => x.queryKey[0] === "org" });
        identity.current = key;
      }
      return next;
    },
    retry: 1,
    staleTime: 0,
    refetchInterval: 60000,
  });
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const tokenHash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type");
    if (url.searchParams.has("recovery") || type === "invite" || type === "recovery")
      setRecovery(true);
    if (tokenHash && (type === "invite" || type === "recovery")) {
      setExchanging(true);
      window.history.replaceState({}, "", "/?recovery=1");
      void verifyEmailLink({ data: { tokenHash, type } })
        .then(() => q.invalidateQueries({ queryKey: ["session"] }))
        .catch(() => setCallbackError("Link inválido ou expirado."))
        .finally(() => setExchanging(false));
    }
    if (code) {
      setExchanging(true);
      window.history.replaceState(
        {},
        "",
        url.pathname + (url.searchParams.has("recovery") ? "?recovery=1" : ""),
      );
      void exchangeAuthCode({ data: { code } })
        .then(() => q.invalidateQueries({ queryKey: ["session"] }))
        .catch(() => setCallbackError("Link inválido ou expirado."))
        .finally(() => setExchanging(false));
    }
    const db = browserSupabase();
    const subscription = db?.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        q.removeQueries({ predicate: (x) => x.queryKey[0] === "org" });
        void q.invalidateQueries({ queryKey: ["session"] });
      }
    });
    return () => subscription?.data.subscription.unsubscribe();
  }, [q]);
  useEffect(() => {
    if (session.data?.status !== "authenticated")
      q.removeQueries({ predicate: (x) => x.queryKey[0] === "org" });
  }, [session.data?.status, q]);
  if (exchanging || session.isPending)
    return (
      <AuthFrame>
        <p>Verificando acesso…</p>
      </AuthFrame>
    );
  if (callbackError)
    return (
      <AuthFrame>
        <p role="alert">{callbackError}</p>
        <a href="/">Voltar</a>
      </AuthFrame>
    );
  if (session.isError)
    return (
      <AuthFrame>
        <p role="alert">Não foi possível verificar sua sessão.</p>
        <Button onClick={() => session.refetch()}>Tentar novamente</Button>
      </AuthFrame>
    );
  if (session.data.status === "unconfigured")
    return (
      <AuthFrame>
        <h1 className="text-xl font-semibold">Conexão pendente</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          O ambiente ainda precisa ser conectado ao Supabase. Nenhum dado operacional está
          disponível.
        </p>
      </AuthFrame>
    );
  if (recovery)
    return (
      <PasswordForm
        onDone={() => {
          setRecovery(false);
          window.history.replaceState({}, "", "/");
          void q.invalidateQueries({ queryKey: ["session"] });
        }}
      />
    );
  if (session.data.status === "anonymous") return <LoginForm />;
  if (session.data.status === "no_access")
    return (
      <AuthFrame>
        <h1 className="text-xl font-semibold">Acesso não liberado</h1>
        <p className="my-4 text-sm">Solicite ao administrador um vínculo ativo na Vyon.</p>
        <LogoutButton />
      </AuthFrame>
    );
  return <MemberContext.Provider value={session.data.member}>{children}</MemberContext.Provider>;
}
function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <section className="w-full max-w-sm rounded-lg border border-border bg-card p-7">
        <p className="mb-6 font-semibold text-primary">Vyon Performance OS</p>
        {children}
      </section>
    </main>
  );
}
function LoginForm() {
  const q = useQueryClient();
  const [message, setMessage] = useState("");
  const form = useForm<z.infer<typeof loginInput>>({
    resolver: zodResolver(loginInput),
    defaultValues: { email: "", password: "" },
  });
  const login = useMutation({
    mutationFn: signIn,
    onSuccess: () => q.invalidateQueries({ queryKey: ["session"] }),
  });
  async function recover() {
    if (!(await form.trigger("email"))) return;
    const db = browserSupabase();
    if (!db) return;
    const { error } = await db.auth.resetPasswordForEmail(form.getValues("email"), {
      redirectTo: window.location.origin + "/?recovery=1",
    });
    setMessage(
      error
        ? "Não foi possível solicitar a recuperação."
        : "Se o e-mail estiver cadastrado, você receberá as instruções.",
    );
  }
  return (
    <AuthFrame>
      <h1 className="mb-4 text-xl font-semibold">Entrar</h1>
      <form onSubmit={form.handleSubmit((data) => login.mutate({ data }))} className="space-y-4">
        <label className="field">
          E-mail
          <Input type="email" autoComplete="username" {...form.register("email")} />
          {form.formState.errors.email && <span>Informe um e-mail válido.</span>}
        </label>
        <label className="field">
          Senha
          <Input type="password" autoComplete="current-password" {...form.register("password")} />
        </label>
        {login.error && (
          <p role="alert" className="text-sm text-destructive">
            {login.error.message}
          </p>
        )}
        <Button className="w-full" disabled={login.isPending}>
          {login.isPending ? "Entrando…" : "Entrar"}
        </Button>
      </form>
      <button onClick={recover} className="mt-4 text-xs text-primary">
        Esqueci minha senha
      </button>
      {message && (
        <p role="status" className="mt-3 text-xs">
          {message}
        </p>
      )}
    </AuthFrame>
  );
}
function PasswordForm({ onDone }: { onDone: () => void }) {
  const schema = z.object({ password: z.string().min(12, "Use ao menos 12 caracteres") });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const mutation = useMutation({ mutationFn: updatePassword, onSuccess: onDone });
  return (
    <AuthFrame>
      <h1 className="mb-4 text-xl font-semibold">Definir senha</h1>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate({ data }))} className="space-y-4">
        <label className="field">
          Nova senha
          <Input type="password" autoComplete="new-password" {...form.register("password")} />
          {form.formState.errors.password?.message}
        </label>
        <Button disabled={mutation.isPending}>Salvar senha</Button>
        {mutation.error && <p role="alert">{mutation.error.message}</p>}
      </form>
    </AuthFrame>
  );
}
export function LogoutButton() {
  const q = useQueryClient();
  const logout = useMutation({
    mutationFn: () => signOut(),
    onSuccess: async () => {
      await q.cancelQueries();
      q.removeQueries({ predicate: (x) => x.queryKey[0] === "org" });
      await q.invalidateQueries({ queryKey: ["session"] });
    },
  });
  return (
    <>
      <Button variant="ghost" size="sm" disabled={logout.isPending} onClick={() => logout.mutate()}>
        Sair
      </Button>
      {logout.error && <span role="alert">Falha ao sair.</span>}
    </>
  );
}
