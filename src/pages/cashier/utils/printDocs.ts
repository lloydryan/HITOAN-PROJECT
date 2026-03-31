import { Order } from "../../../types";
import { currency, dt } from "../../../utils/format";
import { ReceiptData } from "../types";
import { getVatLabel } from "../../../utils/orderPricing";

const THERMAL_PAPER_WIDTH_MM = 58;
const THERMAL_CONTENT_WIDTH_MM = 50;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function openPrintWindow(title: string) {
  const win = window.open("", "_blank", "width=420,height=760");
  if (!win) return null;
  win.document.write(`<html><head><title>${title}</title></head><body></body></html>`);
  return win;
}

export function printReceiptDoc(receipt: ReceiptData) {
  const companyName = "J Limbaga's Hitoan & BBQ";
  const location = "Matina Aplaya, Davao City";
  const win = openPrintWindow(`Receipt ${receipt.order.orderNumber}`);
  if (!win) return;

  const subtotal = Number(
    receipt.order.items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2),
  );
  const tax = Number((receipt.order.total - subtotal).toFixed(2));
  const discountLabel =
    receipt.discountType === "pwd"
      ? "PWD"
      : receipt.discountType === "senior"
        ? "Senior"
        : "Discount";
  const itemRows = receipt.order.items
    .map(
      (i) =>
        `<tr>
          <td>
            <div class="item-name">${escapeHtml(i.nameSnapshot)}</div>
            <div class="item-qty">${i.qty} x ${currency(i.priceSnapshot)}</div>
          </td>
          <td class="amount">${currency(i.subtotal)}</td>
        </tr>`,
    )
    .join("");

  win.document.body.innerHTML = `
    <style>
      @page {
        size: ${THERMAL_PAPER_WIDTH_MM}mm auto;
        margin: 0;
      }
      html, body {
        width: ${THERMAL_PAPER_WIDTH_MM}mm;
        margin: 0;
        padding: 0;
        font-family: "Courier New", "Lucida Console", monospace;
        font-size: 11px;
        color: #111;
      }
      .receipt {
        width: ${THERMAL_CONTENT_WIDTH_MM}mm;
        margin: 0 auto;
        padding: 3mm 0;
      }
      .center {
        text-align: center;
      }
      .title {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.6px;
      }
      .muted {
        color: #444;
      }
      .line {
        border-top: 1px dashed #444;
        margin: 7px 0;
      }
      .meta div {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 2px;
      }
      .items {
        width: 100%;
        border-collapse: collapse;
      }
      .items td {
        vertical-align: top;
        padding: 2px 0;
      }
      .item-name {
        word-break: break-word;
        padding-right: 8px;
      }
      .item-qty {
        font-size: 10px;
        color: #444;
      }
      .amount {
        text-align: right;
        white-space: nowrap;
        padding-left: 10px;
      }
      .totals div {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin: 2px 0;
      }
      .strong {
        font-weight: 700;
      }
    </style>
    <div class="receipt">
      <div class="center">
        <div class="title">${companyName}</div>
        <div class="muted">Location : ${location}</div>
      </div>

      <div class="line"></div>

      <div class="meta">
        <div><span>Receipt #</span><span>${escapeHtml(receipt.order.orderNumber)}</span></div>
        <div><span>Table</span><span>${escapeHtml(receipt.order.tableNumber || "-")}</span></div>
        <div><span>Paid At</span><span>${dt(new Date(receipt.paidAt))}</span></div>
        <div><span>Method</span><span>${escapeHtml(receipt.method.toUpperCase())}</span></div>
      </div>

      ${receipt.order.orderNotes ? `<div style="margin-top:6px;"><span class="muted">Notes:</span> ${escapeHtml(receipt.order.orderNotes)}</div>` : ""}

      <div class="line"></div>
      <table class="items">
        ${itemRows}
      </table>

      <div class="line"></div>
      <div class="totals">
        <div><span>Subtotal</span><span>${currency(subtotal)}</span></div>
        <div><span>${getVatLabel(receipt.order.vatEnabled ?? true)}</span><span>${currency(tax)}</span></div>
        <div><span>Total</span><span>${currency(receipt.order.total)}</span></div>
        ${receipt.discountAmount > 0 ? `<div><span>${discountLabel}${receipt.discountRate > 0 ? ` ${Math.round(receipt.discountRate * 100)}%` : ""}</span><span>- ${currency(receipt.discountAmount)}</span></div>` : ""}
        ${receipt.discountAmount > 0 && receipt.discountedPersons != null && receipt.totalPersons != null && receipt.totalPersons > 0 ? `<div><span>Discounted Pax</span><span>${receipt.discountedPersons}/${receipt.totalPersons}</span></div>` : ""}
        <div class="strong"><span>Amount Due</span><span>${currency(receipt.amountDue)}</span></div>
        <div><span>${receipt.method === "cash" ? "Cash" : "Amount Paid"}</span><span>${currency(receipt.amountPaid)}</span></div>
        ${receipt.method === "cash" ? `<div class="strong"><span>Change</span><span>${currency(receipt.change)}</span></div>` : ""}
      </div>

      <div class="line"></div>
      <div class="center">Thank you!</div>
      <div class="center strong">*****Official Receipt*****</div>
    </div>
  `.trim();

  win.document.close();
  win.focus();
  win.print();
}

export function printBillDoc(billOrder: Order) {
  const companyName = "J Limbaga's Hitoan & BBQ";
  const location = "Matina Aplaya, Davao City";
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
    <div style="margin-bottom:6px;">Location : ${location}</div>
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
    <div style="display:flex; justify-content:space-between;"><span>${getVatLabel(billOrder.vatEnabled ?? true)}</span><strong>${currency(billTax)}</strong></div>
    <div style="display:flex; justify-content:space-between;"><span>Total</span><strong>${currency(billOrder.total)}</strong></div>
    <div style="text-align:center; margin-top:12px; font-weight:700;">*****Bill*****</div>
  `;

  win.document.close();
  win.focus();
  win.print();
}
