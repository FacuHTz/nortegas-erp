import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Input, Select, Button } from "@/components/ui";
import { crearProducto } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function NuevoProductoPage() {
  const supabase = await createClient();
  const { data: listas } = await supabase.from("listas_precios").select("id, nombre").order("id");

  return (
    <>
      <PageHeader title="Nuevo producto" subtitle="Definí el artículo y su precio en cada lista." />
      <Card className="max-w-2xl">
        <form action={crearProducto} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Código" name="codigo" required placeholder="G10-EX" />
            <Input label="Nombre" name="nombre" required placeholder="Garrafa 10 kg ExtraGAS" />
            <Select label="Tipo" name="tipo" defaultValue="garrafa">
              <option value="garrafa">Garrafa</option>
              <option value="cilindro">Cilindro</option>
              <option value="accesorio">Accesorio</option>
              <option value="servicio">Servicio</option>
            </Select>
            <Input label="Capacidad (kg)" name="capacidad_kg" type="number" step="0.1" placeholder="10" />
            <Input label="Marca" name="marca" placeholder="ExtraGAS / YPF GAS" />
            <Input label="Costo" name="costo" type="number" step="0.01" placeholder="0,00" />
            <Select label="Alícuota IVA" name="iva_alicuota" defaultValue="10.5">
              <option value="10.5">10,5% (GLP envasado)</option>
              <option value="21">21%</option>
            </Select>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" name="requiere_envase" defaultChecked className="h-4 w-4 accent-brand" />
              Requiere envase (canje / comodato)
            </label>
          </div>

          <div className="border-t border-line pt-4">
            <p className="mb-3 text-sm font-medium">Precio por lista</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {(listas ?? []).map((l: any) => (
                <Input key={l.id} label={l.nombre} name={`precio_${l.id}`} type="number" step="0.01" placeholder="0,00" />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" href="/productos">Cancelar</Button>
            <Button type="submit">Guardar producto</Button>
          </div>
        </form>
      </Card>
    </>
  );
}
