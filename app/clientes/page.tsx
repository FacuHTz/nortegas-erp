import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Table, Td, Button, Badge, Empty } from "@/components/ui";
import { ars, CONDICIONES } from "@/lib/format";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const supabase = await createClient();
  const [{ data: clientes }, { data: saldos }] = await Promise.all([
    supabase.from("clientes").select("id, codigo, nombre, condicion, tipo, telefono, zona_reparto, activo").order("nombre").limit(300),
    supabase.from("v_saldos_clientes").select("*"),
  ]);
  const saldoDe = (id: number) => Number(saldos?.find((s: any) => s.cliente_id === id)?.saldo ?? 0);

  return (
    <>
      <PageHeader title="Clientes" subtitle="Cartera, condición fiscal y cuenta corriente."
        actions={<Button href="/clientes/nuevo"><Plus size={16} /> Nuevo cliente</Button>} />
      {(clientes ?? []).length === 0 ? (
        <Empty title="Sin clientes cargados" action={<Button href="/clientes/nuevo">Crear cliente</Button>} />
      ) : (
        <Table head={["Código", "Nombre", "Condición", "Tipo", "Zona", "Teléfono", "Saldo"]}>
          {(clientes ?? []).map((c: any) => {
            const saldo = saldoDe(c.id);
            return (
              <tr key={c.id} className="hover:bg-gray-50/60">
                <Td className="text-muted">{c.codigo}</Td>
                <Td><Link href={`/clientes/${c.id}`} className="font-medium text-brand hover:underline">{c.nombre}</Link></Td>
                <Td><Badge tone={c.condicion === "responsable_inscripto" ? "blue" : "gray"}>{CONDICIONES[c.condicion]}</Badge></Td>
                <Td className="capitalize">{c.tipo}</Td>
                <Td>{c.zona_reparto ?? "—"}</Td>
                <Td>{c.telefono ?? "—"}</Td>
                <Td right className={saldo > 0 ? "font-semibold text-danger" : "text-muted"}>{ars(saldo)}</Td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
