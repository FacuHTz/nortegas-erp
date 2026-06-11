import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Table, Td, Badge, Button, Select } from "@/components/ui";
import { fecha } from "@/lib/format";
import { actualizarRol } from "@/lib/actions";

export const dynamic = "force-dynamic";

const ROLES: Record<string, { label: string; tone: string }> = {
  admin: { label: "Admin", tone: "brand" },
  ventas: { label: "Ventas", tone: "blue" },
  chofer: { label: "Chofer", tone: "amber" },
  contable: { label: "Contable", tone: "green" },
};

export default async function EmpleadosPage() {
  const supabase = await createClient();
  const [{ data: perfiles }, { data: { user } }] = await Promise.all([
    supabase.from("perfiles").select("*").order("created_at"),
    supabase.auth.getUser(),
  ]);

  return (
    <>
      <PageHeader title="Equipo" subtitle="Usuarios del sistema, roles y permisos." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Usuarios">
            <Table head={["Nombre", "Rol", "Estado", "Alta", "Cambiar"]}>
              {(perfiles ?? []).map((p: any) => {
                const r = ROLES[p.rol];
                const esYo = p.id === user?.id;
                return (
                  <tr key={p.id}>
                    <Td>
                      <span className="font-medium">{p.nombre}</span>
                      {esYo && <span className="ml-2 text-xs text-muted">(vos)</span>}
                      {p.telefono && <span className="block text-xs text-muted">{p.telefono}</span>}
                    </Td>
                    <Td><Badge tone={r?.tone}>{r?.label ?? p.rol}</Badge></Td>
                    <Td><Badge tone={p.activo ? "green" : "red"}>{p.activo ? "Activo" : "Inactivo"}</Badge></Td>
                    <Td className="text-muted">{fecha(p.created_at)}</Td>
                    <Td>
                      {esYo ? (
                        <span className="text-xs text-muted">—</span>
                      ) : (
                        <form
                          action={async (fd: FormData) => {
                            "use server";
                            await actualizarRol(p.id, String(fd.get("rol")), fd.get("activo") === "on");
                          }}
                          className="flex items-center gap-2"
                        >
                          <Select name="rol" defaultValue={p.rol} className="!py-1.5 text-xs">
                            {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </Select>
                          <label className="flex items-center gap-1 text-xs">
                            <input type="checkbox" name="activo" defaultChecked={p.activo} className="h-3.5 w-3.5 accent-brand" /> Activo
                          </label>
                          <Button type="submit" variant="secondary" className="!px-2.5 !py-1.5 text-xs">Guardar</Button>
                        </form>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </Table>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Cómo sumar un usuario">
            <ol className="list-decimal space-y-2 pl-4 text-sm text-ink">
              <li>En Supabase, andá a <span className="font-medium">Authentication → Users → Add user</span>.</li>
              <li>Cargá email y contraseña (o mandá invitación por email).</li>
              <li>Al primer login se crea su perfil automáticamente con rol <span className="font-medium">Ventas</span>.</li>
              <li>Desde esta pantalla ajustale el rol: Admin, Ventas, Chofer o Contable.</li>
            </ol>
          </Card>

          <Card title="Permisos por rol">
            <ul className="space-y-2 text-sm">
              <li><Badge tone="brand">Admin</Badge> <span className="text-muted">Todo, incluida la configuración de empresa.</span></li>
              <li><Badge tone="blue">Ventas</Badge> <span className="text-muted">Pedidos, clientes, cobranzas, productos, compras, caja y facturación.</span></li>
              <li><Badge tone="green">Contable</Badge> <span className="text-muted">Igual que Ventas, pensado para facturación e impuestos.</span></li>
              <li><Badge tone="amber">Chofer</Badge> <span className="text-muted">Ve todo, pero solo puede actualizar pedidos y rutas (entregas).</span></li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
