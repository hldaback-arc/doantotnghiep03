import { useState, type FormEvent } from "react";
import { useRouter } from "next/router";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, ...(mode === "register" ? { name } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error?.message ?? "Không thể xác thực tài khoản.");
        return;
      }
      await router.push("/");
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-slate-50">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
          Sổ chi tiêu
        </p>
        <h1 className="mt-3 text-2xl font-semibold">
          {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
        </h1>
        <div className="mt-6 grid grid-cols-2 border-b border-slate-700" role="tablist">
          {(["login", "register"] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={mode === item}
              onClick={() => { setMode(item); setError(""); }}
              className={`border-b-2 px-3 py-3 text-sm ${mode === item ? "border-emerald-400 text-emerald-300" : "border-transparent text-slate-400"}`}
            >
              {item === "login" ? "Đăng nhập" : "Đăng ký"}
            </button>
          ))}
        </div>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          {mode === "register" && (
            <label className="block text-sm text-slate-300">
              Tên hiển thị
              <input
                autoComplete="name"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-emerald-400"
                maxLength={100}
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </label>
          )}
          <label className="block text-sm text-slate-300">
            Email
            <input
              required
              autoComplete="email"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-emerald-400"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </label>
          <label className="block text-sm text-slate-300">
            Mật khẩu
            <input
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-emerald-400"
              minLength={mode === "register" ? 12 : 1}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
            {mode === "register" && <span className="mt-1 block text-xs text-slate-500">Tối thiểu 12 ký tự</span>}
          </label>
          {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
          <button
            className="w-full rounded-lg bg-emerald-400 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {submitting ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </button>
        </form>
      </section>
    </main>
  );
}