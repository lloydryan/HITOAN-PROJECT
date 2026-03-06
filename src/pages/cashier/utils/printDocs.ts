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
  const companyName = "HITOAN Restaurant";
  const totalQty = receipt.order.items.reduce((sum, i) => sum + i.qty, 0);
  const receiptSubtotal = Number(
    receipt.order.items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2),
  );
  const receiptTax = Number((receipt.order.total - receiptSubtotal).toFixed(2));
  const win = openPrintWindow(`Receipt ${receipt.order.orderNumber}`);
  if (!win) return;

  const rows = receipt.order.items
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
    <div style="margin-bottom:8px;">Official Receipt</div>
    <div>Order: ${receipt.order.orderNumber}</div>
    <div>Table: ${receipt.order.tableNumber || "-"}</div>
    <div>Created: ${dt(receipt.order.createdAt?.toDate())}</div>
    <div>Paid: ${dt(new Date(receipt.paidAt))}</div>
    <div>Method: ${receipt.method.toUpperCase()}</div>
    <div>Discount: ${receipt.discountType === "none" ? "None" : receipt.discountType.toUpperCase()}</div>
    ${
      receipt.discountType !== "none"
        ? `<div>Discounted Persons: ${receipt.discountedPersons || 0}/${receipt.totalPersons || 1}</div>`
        : ""
    }
    ${
      receipt.method !== "cash"
        ? `<div>Ref (Last 4): ${receipt.transferLast4 || "N/A"}</div>`
        : ""
    }
    <div>Total Qty: ${totalQty}</div>
    <hr />
    <table style="width:100%; border-collapse: collapse;">
      <thead><tr><th style="text-align:left;">Item</th><th style="text-align:right;">Qty</th><th style="text-align:right;">Subtotal</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <hr />
    <div style="display:flex; justify-content:space-between;"><span>Subtotal</span><strong>${currency(receiptSubtotal)}</strong></div>
    <div style="display:flex; justify-content:space-between;"><span>Tax (12%)</span><strong>${currency(receiptTax)}</strong></div>
    <div style="display:flex; justify-content:space-between;"><span>Total</span><strong>${currency(receipt.order.total)}</strong></div>
    <div style="display:flex; justify-content:space-between;"><span>Discount</span><strong>- ${currency(receipt.discountAmount)}</strong></div>
    <div style="display:flex; justify-content:space-between;"><span>Amount Due</span><strong>${currency(receipt.amountDue)}</strong></div>
    <div style="display:flex; justify-content:space-between;"><span>Amount Paid</span><strong>${currency(
      receipt.amountPaid,
    )}</strong></div>
    <div style="display:flex; justify-content:space-between;"><span>Change</span><strong>${currency(
      receipt.change,
    )}</strong></div>
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
