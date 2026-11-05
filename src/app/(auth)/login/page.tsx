import { LoginForm } from "@/features/auth/login-form";

export const metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-dvh flex-col">
      
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <div className="label">Sistema de bodega</div>
            <h1 className="font-mono text-3xl font-semibold tracking-tight">
              VMANQUE<span className="text-accent">/</span>WMS
            </h1>
          </div>
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
