import { createClient } from "@/lib/supabase/server";
import { PageHeader, Table, Td, Button, Badge, Empty } from "@/components/ui";
import { ars } from "@/lib/format";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

const TIPOS: Record<string, string> = { garrafa: "Garrafa", cilindro: "Cilindro", accesorio: "Accesorio", servicio: "Servicio" };

export default async function ProductosPage() {
  const supabase = await createClient();
  const [{ data: productos }, { data: listas }, { data: precios }] = await Promise.all([
    supabase.from("productos").select("*").order("tipo").order("nombre"),
    supabase.from("listas_precios").select("id, nombre").order("id"),
    supabase.from("precios_productos").select("producto_id, lista_id, precio"),
  ]);

  const precioDe = (prodId: number, listaId: number) =>
    Number(precios?.find((p: any) => p.producto_id === prodId && p.lista_id === listaId)?.precio ?? 0);

  return (
    <>
      <PageHeader title="Productos" subtitle="Catálogo, costos y precios por lista."
        actions={<Button href="/productos/nuevo"><Plus size={16} /> Nuevo producto</Button>} />

      {(productos ?? []).length === 0 ? (
        <Empty title="Sin productos" hint="Cargá el seed.sql o creá tu primer producto." action={<Button href="/productos/nuevo">Crear producto</Button>} />
      ) : (
        <Table head={["Código", "Producto", "Tipo", "IVA", "Costo", ...(listas ?? []).map((l: any) => l.nombre)]}>
          {(productos ?? []).map((p: any) => (
            <tr key={p.id} className="hover:bg-gray-50/60">
              <Td className="text-muted">{p.codigo}</Td>
              <Td>
                <span className="font-medium">{p.nombre}</span>
                {!p.activo && <Badge tone="red">Inactivo</Badge>}
                {p.requiere_envase && <span className="ml-2 text-xs text-muted">↺ envase</span>}
              </Td>
              <Td>{TIPOS[p.tipo] ?? p.tipo}</Td>
              <Td right>{Number(p.iva_alicuota)}%</Td>
              <Td right className="text-muted">{ars(p.costo)}</Td>
              {(listas ?? []).map((l: any) => (
                <Td key={l.id} right className="font-medium tabular-nums">{ars(precioDe(p.id, l.id))}</Td>
              ))}
            </tr>
          ))}
        </Table>
      )}
      <p className="mt-3 text-xs text-muted">Los precios se editan desde el alta del producto o actualizando la tabla precios_productos. GLP envasado lleva IVA 10,5%; accesorios y servicios, 21%.</p>
    </>
  );
}
