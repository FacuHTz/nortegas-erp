import { createClient } from "@/lib/supabase/server";
import { crearCliente } from "@/lib/actions";
import { PageHeader, Card, Button, Input, Select } from "@/components/ui";
import { CONDICIONES } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function NuevoClientePage() {
  const supabase = await createClient();
  const { data: listas } = await supabase.from("listas_precios").select("id, nombre").eq("activa", true);

  return (
    <>
      <PageHeader title="Nuevo cliente" />
      <form action={crearCliente}>
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nombre / Razón social" name="nombre" required placeholder="Rotisería El Buen Sabor" />
            <Input label="CUIT / DNI" name="cuit_dni" placeholder="30-12345678-9" />
            <Select label="Condición fiscal" name="condicion" defaultValue="consumidor_final">
              {Object.entries(CONDICIONES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            <Select label="Tipo" name="tipo" defaultValue="particular">
              {["particular", "comercio", "industria", "distribuidor"].map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Input label="Teléfono" name="telefono" placeholder="343-..." />
            <Input label="Email" name="email" type="email" />
            <Input label="Dirección" name="direccion" />
            <Input label="Localidad" name="localidad" defaultValue="General Ramírez" />
            <Input label="Zona de reparto" name="zona_reparto" placeholder="Centro / Norte / Sur" />
            <Select label="Lista de precios" name="lista_precio_id">
              <option value="">Sin lista asignada</option>
              {(listas ?? []).map((l: any) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </Select>
            <Input label="Límite de crédito (cta. cte.)" name="limite_credito" type="number" min={0} defaultValue={0} />
          </div>
          <div className="mt-5 flex gap-2">
            <Button type="submit">Guardar cliente</Button>
            <Button href="/clientes" variant="secondary">Cancelar</Button>
          </div>
        </Card>
      </form>
    </>
  );
}
