import { Order } from "../../../types";
import { currency, dt } from "../../../utils/format";
import { ReceiptData } from "../types";

function openPrintWindow(title: string) {
  const win = window.open("", "_blank", "width=420,height=760");
  if (!win) return null;
  win.document.write(`<html><head><title>${title}</title></head><body></body></html>`);
  return win;
}

export function printReceiptDoc(receipt: ReceiptData) {
  const companyName = "HITOAN RESTAURANT";
  const tagline = "Catfish Specialties";
  const receiptSubtotal = Number(
    receipt.order.items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2),
  );
  const receiptTax = Number((receipt.order.total - receiptSubtotal).toFixed(2));
  const win = openPrintWindow(`Receipt ${receipt.order.orderNumber}`);
  if (!win) return;

  const itemRows = receipt.order.items
    .map(
      (i) =>
        `<tr><td>${i.nameSnapshot}</td><td style="text-align:right;">${currency(i.subtotal)}</td></tr>`,
    )
    .join("");

  /* 80mm thermal receipt - Owner spec */
  win.document.body.style.fontFamily = "'Inter', Arial, sans-serif";
  win.document.body.style.fontSize = "12px";
  win.document.body.style.padding = "12px";
  win.document.body.style.maxWidth = "80mm";
  win.document.body.style.margin = "0 auto";
  win.document.body.innerHTML = `
    <div style="text-align:center; border-bottom:1px dashed #333; padding-bottom:8px; margin-bottom:8px;">
      <div style="font-size:14px; font-weight:700; letter-spacing:1px;">${companyName}</div>
      <div style="font-size:11px; color:#555;">${tagline}</div>
    </div>
    <div style="border-bottom:1px dashed #333; padding-bottom:8px; margin-bottom:8px;">
      <div>Order #${receipt.order.orderNumber}</div>
      ${receipt.order.orderNotes ? `<div style="margin-top:4px; font-style:italic;">Notes: ${receipt.order.orderNotes}</div>` : ""}
      <table style="width:100%; border-collapse:collapse; font-size:12px;">
        ${itemRows}
      </table>
    </div>
    <div style="border-bottom:1px dashed #333; padding-bottom:8px; margin-bottom:8px;">
      <div style="display:flex; justify-content:space-between;"><span>Total</span><strong>${currency(receipt.order.total)}</strong></div>
      <div style="display:flex; justify-content:space-between;"><span>${receipt.method === "cash" ? "Cash" : "Amount Paid"}</span><strong>${currency(receipt.amountPaid)}</strong></div>
      ${receipt.method === "cash" ? `<div style="display:flex; justify-content:space-between;"><span>Change</span><strong>${currency(receipt.change)}</strong></div>` : ""}
    </div>
    <div style="text-align:center; font-size:11px; padding-top:8px;">
      Thank you!
    </div>
  `;

  win.document.close();
  win.focus();
  win.print();
}

export function printBillDoc(billOrder: Order) {
  const companyName = "HITOAN Restaurant";
  const totalQty = billOrder.items.reduce((sum, i) => sum + i.qty, 0);
  const billSubtotal = Number(
    billOrder.items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2),
  );
  const billTax = Number((billOrder.total - billSubtotal).toFixed(2));
  const win = openPrintWindow(`Bill ${billOrder.orderNumber}`);
  if (!win) return;

  const rows = billOrder.items
    .map(
      (i) =>
        `<tr><td>${i.nameSnapshot}</td><td style="text-align:right;">${i.qty}</td><td style="text-align:right;">${currency(
          i.subtotal,
        )}</td></tr>`,
    )
    .join("");

  win.document.body.style.fontFamily = "Arial, sans-serif";
  win.document.body.style.padding = "16px";
  win.document.body.innerHTML = `
    <h3 style="margin:0 0 4px;">${companyName}</h3>
    <div style="margin-bottom:8px;">Customer Bill</div>
    <div>Order: ${billOrder.orderNumber}</div>
    <div>Table: ${billOrder.tableNumber || "-"}</div>
    ${billOrder.orderNotes ? `<div>Order Notes: ${billOrder.orderNotes}</div>` : ""}
    <div>Created: ${dt(billOrder.createdAt?.toDate())}</div>
    <div>Total Qty: ${totalQty}</div>
    <hr />
    <table style="width:100%; border-collapse: collapse;">
      <thead><tr><th style="text-align:left;">Item</th><th style="text-align:right;">Qty</th><th style="text-align:right;">Subtotal</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <hr />
    <div style="display:flex; justify-content:space-between;"><span>Subtotal</span><strong>${currency(billSubtotal)}</strong></div>
    <div style="display:flex; justify-content:space-between;"><span>Tax (12%)</span><strong>${currency(billTax)}</strong></div>
    <div style="display:flex; justify-content:space-between;"><span>Total</span><strong>${currency(billOrder.total)}</strong></div>
  `;

  win.document.close();
  win.focus();
  win.print();
}
