export const ars = (n: number | null | undefined) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n ?? 0);

export const arsDec = (n: number | null | undefined) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n ?? 0);

export const fecha = (d: string | Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Argentina/Cordoba" }).format(new Date(d)) : "—";

export const fechaHora = (d: string | Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Cordoba" }).format(new Date(d)) : "—";

export const num = (n: number | null | undefined, dec = 0) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: dec }).format(n ?? 0);

export const CONDICIONES: Record<string, string> = {
  responsable_inscripto: "Resp. Inscripto",
  monotributo: "Monotributo",
  consumidor_final: "Cons. Final",
  exento: "Exento",
};

export const ESTADOS_PEDIDO: Record<string, { label: string; tone: string }> = {
  borrador: { label: "Borrador", tone: "gray" },
  confirmado: { label: "Confirmado", tone: "blue" },
  en_reparto: { label: "En reparto", tone: "amber" },
  entregado: { label: "Entregado", tone: "green" },
  cancelado: { label: "Cancelado", tone: "red" },
};

export const METODOS_PAGO: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  mercadopago: "Mercado Pago",
  tarjeta: "Tarjeta",
  cheque: "Cheque",
  cuenta_corriente: "Cuenta corriente",
};

export const TIPOS_COMPROBANTE: Record<string, string> = {
  factura_a: "Factura A",
  factura_b: "Factura B",
  factura_c: "Factura C",
  nota_credito_a: "NC A",
  nota_credito_b: "NC B",
  nota_credito_c: "NC C",
  recibo_x: "Recibo X",
};

export const nroComprobante = (pv: number, n: number) =>
  `${String(pv).padStart(4, "0")}-${String(n).padStart(8, "0")}`;
