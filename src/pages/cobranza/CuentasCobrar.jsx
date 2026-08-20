import { useState, useEffect } from "react";
import Pagination from "../../components/ui/Pagination";
import { exportToExcel } from "../../lib/exportExcel";
import { Eye } from "lucide-react";
import Toolbar from "../../components/ui/Toolbar";
import Table, { Td } from "../../components/ui/Table";
import Modal from "../../components/ui/Modal";
import Btn from "../../components/ui/Btn";
import { useFirestoreDocuments } from "../../store/firestoreDb";
import { db as fbDb } from "../../lib/firebase";
import { addDoc, setDoc, doc, collection, getDocs } from "firebase/firestore";
import { showToast } from "../../components/ui/Toast";

// El historial de pagos vive en la subcolección `pagos_CporCobrar`, no en el documento.
function usePagosDeCuenta(cuentaId) {
  const [pagos, setPagos] = useState([]);
  useEffect(() => {
    if (!cuentaId) { setPagos([]); return; }
    let vigente = true;
    (async () => {
      try {
        const snap = await getDocs(collection(fbDb, "cuentasPorCobrar", cuentaId, "pagos_CporCobrar"));
        if (vigente) setPagos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {
        if (vigente) setPagos([]);
      }
    })();
    return () => { vigente = false; };
  }, [cuentaId]);
  return pagos;
}

function PagoModal({ cuenta, onClose, onRegistrarPago, contraparte = "Cliente" }) {
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [monto, setMonto] = useState(0);
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split("T")[0]);

  const saldoRestante = cuenta.saldoPendiente - monto;
  const montoValido = monto > 0 && monto <= cuenta.saldoPendiente;

  return (
    <Modal title={`Registrar pago - ${cuenta.tipoDocumento} ${cuenta.numeroCotizacion}`} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wide">Datos del pago</h4>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[12px] text-[var(--muted)] block mb-1.5">Método de pago</label>
              <select className="bg-[var(--panel-2)] rounded-lg px-3 py-2 text-sm text-[var(--text)] w-full" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                <option value="Efectivo">Efectivo</option>
                <option value="Cheque">Cheque</option>
                <option value="Deposito/Transfer.">Depósito/Transfer.</option>
                <option value="Tarjeta banco">Tarjeta banco</option>
              </select>
            </div>
            <div>
              <label className="text-[12px] text-[var(--muted)] block mb-1.5">Monto</label>
              <input type="number" className="bg-[var(--panel-2)] rounded-lg px-3 py-2 text-sm text-[var(--text)] w-full" value={monto} onChange={(e) => setMonto(Number(e.target.value))} min="0" step="0.01" />
                  {!montoValido && monto > 0 && <p className="text-[11px] text-[var(--danger)] mt-1">El monto no puede exceder el saldo pendiente (S/ {(cuenta.saldoPendiente ?? 0).toFixed(2)})</p>}
            </div>
            <div>
              <label className="text-[12px] text-[var(--muted)] block mb-1.5">Fecha</label>
              <input type="date" className="bg-[var(--panel-2)] rounded-lg px-3 py-2 text-sm text-[var(--text)] w-full" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} />
            </div>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wide">Resumen de pago</h4>
          <div className="bg-[var(--surface-2)] rounded-lg p-4">
            <div className="flex justify-between py-2">
              <span className="text-sm text-[var(--muted)]">Importe de pago</span>
              <span className="text-sm gmp-mono">S/ {monto.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-t border-[var(--line-soft)]">
              <span className="text-sm text-[var(--muted)]">Saldo pendiente</span>
              <span className="text-sm gmp-mono font-semibold">S/ {Math.max(0, saldoRestante).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-t border-[var(--line-soft)]">
              <span className="text-sm text-[var(--muted)]">{contraparte}</span>
              <span className="text-sm font-medium">{cuenta.clientenombre || ""}</span>
            </div>
          </div>
      <Btn className="w-full justify-center mt-4" disabled={!montoValido} onClick={() => { onRegistrarPago(cuenta.id, { metodoPago, monto, fecha: fechaPago }); onClose(); }}>Crear pago</Btn>
        </div>
      </div>
    </Modal>
  );
}

export default function CuentasCobrar({ kind = "Cobrar" }) {
  const [all] = useFirestoreDocuments("cuentasPorCobrar");
  const [pagoCuenta, setPagoCuenta] = useState(null);
  const [detalle, setDetalle] = useState(null);

  const items = all.filter((c) => c.tipoCuenta === kind);
  const title = kind === "Cobrar" ? "Cuentas por cobrar" : "Cuentas por pagar";
  // La misma pantalla sirve para cobrar y para pagar. En «cuentas por pagar» la contraparte
  // es el PROVEEDOR, y el diálogo lo llamaba «Cliente»: al registrar el pago de una compra
  // se leía «Cliente: REPUESTOS JAPONESES».
  const contraparte = kind === "Cobrar" ? "Cliente" : "Proveedor";
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(items.length / 20);
  const pageRows = items.slice(page * 20, (page + 1) * 20);

  // El pago se escribe en Firestore: la cabecera de la cuenta y una entrada en la
  // subcolección `pagos_CporCobrar` (§1.10 BACKEND_SPEC.md), que es donde el legacy
  // guarda el historial. Antes iba a localStorage y desaparecía al recargar.
  const registrarPago = async (id, pago) => {
    const cuenta = all.find((c) => c.id === id);
    if (!cuenta) return;
    const monto = Number(pago.monto) || 0;
    const nuevoPendiente = Math.max(0, Number(cuenta.saldoPendiente || 0) - monto);
    const pagado = Number(cuenta.pagoTotalActual || 0) + monto;
    const estado = nuevoPendiente < 0.01 ? "Pagado" : "Pendiente";

    try {
      await addDoc(collection(fbDb, "cuentasPorCobrar", id, "pagos_CporCobrar"), {
        fecha: pago.fecha || new Date().toISOString().split("T")[0],
        montopagado: monto,
        montopendiente: nuevoPendiente,
        metodopago: pago.metodoPago || "",
        numerocuenta: cuenta.numeroCotizacion || "",
        estado: "aprobado",
        fecha_creacion: new Date().toISOString(),
      });
      await setDoc(
        doc(fbDb, "cuentasPorCobrar", id),
        { pagoTotalActual: pagado, saldoPendiente: nuevoPendiente, estado },
        { merge: true }
      );
      showToast(`Pago de S/ ${monto.toFixed(2)} registrado`, "success");
    } catch (e) {
      console.error("No se pudo registrar el pago:", e);
      showToast("No se pudo registrar el pago", "error");
    }
  };

  return (
    <div>
      <Toolbar title={title} count={items.length} />
      <Table columns={["Documento", "Número", "Razón Social", "Total", "Pago", "Estado", "Fecha", "Detalle"]}
        rows={pageRows}
        renderRow={(r) => (
          <>
            <Td>{r.tipoDocumento || ""}</Td>
            <Td className="gmp-mono">{r.numeroCotizacion || ""}</Td>
            <Td className="font-medium">{r.clientenombre || ""}</Td>
            <Td className="gmp-mono">S/ {Number(r.montoTotal || 0).toFixed(2)}</Td>
            <Td className="gmp-mono">S/ {Number(r.pagoTotalActual || 0).toFixed(2)}</Td>
            <Td><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${r.estado === "Pagado" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{r.estado || "—"}</span></Td>
            <Td className="gmp-mono text-[var(--muted)]">{r.fecha || ""}</Td>
            <Td>
              <div className="flex gap-1">
                <button onClick={() => setDetalle(r)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" title="Ver detalle"><Eye size={15} /></button>
                {r.estado !== "Pagado" && <Btn variant="ghost" onClick={() => setPagoCuenta(r)}>Pagar</Btn>}
              </div>
            </Td>
          </>
        )}
      />
      {pagoCuenta && <PagoModal cuenta={pagoCuenta} onClose={() => setPagoCuenta(null)} onRegistrarPago={registrarPago} contraparte={contraparte} />}
      {detalle && <DetalleModal cuenta={detalle} onClose={() => setDetalle(null)} contraparte={contraparte} />}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

function DetalleModal({ cuenta, onClose, contraparte = "Cliente" }) {
  const pagos = usePagosDeCuenta(cuenta.id);
  return (
    <Modal title={`${cuenta.tipoDocumento} ${cuenta.numeroCotizacion}`} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div><span className="text-[12px] text-[var(--muted)]">{contraparte}</span><p className="text-sm font-medium">{cuenta.clientenombre || ""}</p></div>
        <div><span className="text-[12px] text-[var(--muted)]">Total</span><p className="text-sm gmp-mono">S/ {Number(cuenta.montoTotal || 0).toFixed(2)}</p></div>
        <div><span className="text-[12px] text-[var(--muted)]">Pagado</span><p className="text-sm gmp-mono">S/ {Number(cuenta.pagoTotalActual || 0).toFixed(2)}</p></div>
        <div><span className="text-[12px] text-[var(--muted)]">Saldo</span><p className="text-sm gmp-mono">S/ {Number(cuenta.saldoPendiente || 0).toFixed(2)}</p></div>
        <div><span className="text-[12px] text-[var(--muted)]">Estado</span><p className="text-sm">{cuenta.estado || ""}</p></div>
        <div><span className="text-[12px] text-[var(--muted)]">Fecha</span><p className="text-sm">{cuenta.fecha || ""}</p></div>
      </div>
      <h4 className="text-sm font-semibold text-[var(--text)] mb-3 uppercase tracking-wide">Historial de pagos</h4>
      {pagos.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Todavía no se ha registrado ningún pago en esta cuenta.</p>
      ) : (
        <div className="bg-[var(--surface-2)] rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--text)] font-semibold">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-right">Saldo restante</th>
              </tr>
            </thead>
            <tbody>
              {pagos.map((p) => (
                <tr key={p.id} className="border-t border-[var(--line-soft)]">
                  <td className="px-4 py-3">{p.fecha || ""}</td>
                  <td className="px-4 py-3">{p.metodopago || ""}</td>
                  <td className="px-4 py-3 text-right gmp-mono">S/ {Number(p.montopagado || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right gmp-mono">S/ {Number(p.montopendiente || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}




