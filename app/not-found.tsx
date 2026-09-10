import Link from "next/link";
export default function NotFound() {
  return (
    <main className="center-screen">
      <h1>Página não encontrada</h1>
      <Link className="primary" href="/">
        Voltar para minhas tarefas
      </Link>
    </main>
  );
}
