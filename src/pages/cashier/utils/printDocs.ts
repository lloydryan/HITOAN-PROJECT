import { Order } from "../../../types";
import { currency, currencyReceipt, dt } from "../../../utils/format";
import { ReceiptData } from "../types";
import { getVatLabel } from "../../../utils/orderPricing";

function openPrintWindow(title: string) {
  const win = window.open("", "_blank", "width=420,height=760");
  if (!win) return null;
  win.document.write(
    `<html><head><title>${title}</title></head><body></body></html>`,
  );
  return win;
}

export function printReceiptDoc(receipt: ReceiptData) {
  const win = openPrintWindow(`Receipt ${receipt.order.orderNumber}`);
  if (!win) return;

  const formatReceiptDate = (d: Date | undefined) => {
    if (!d) return "-";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  const receiptSubtotal = Number(
    receipt.order.items
      .reduce((sum, item) => sum + item.subtotal, 0)
      .toFixed(2),
  );
  const receiptTax = Number((receipt.order.total - receiptSubtotal).toFixed(2));

  const itemRows = receipt.order.items
    .map(
      (item) => `
      <div class="row item-row">
        <span>${item.nameSnapshot} x${item.qty}</span>
        <span class="amount">${currencyReceipt(item.subtotal)}</span>
      </div>`,
    )
    .join("");

  win.document.body.innerHTML = `
    <style>
      body {
        font-family: Arial, sans-serif;
        font-size: 12px;
        padding: 12px;
        margin: 0 auto;
        max-width: 80mm;
      }
      .receipt {
        color: #111;
      }
      .header {
        text-align: center;
        border-bottom: 1px solid #ccc;
        padding-bottom: 8px;
      }
      .brand {
        font-size: 14px;
        font-weight: 700;
      }
      .meta, .order {
        margin-top: 4px;
      }
      .section {
        border-bottom: 1px solid #ddd;
        padding: 8px 0;
      }
      .row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
        margin: 2px 0;
      }
      .row > span:first-child {
        flex: 1;
      }
      .amount {
        font-weight: 700;
        text-align: right;
        white-space: nowrap;
      }
      .item-row span:first-child {
        white-space: nowrap;
      }
      .footer {
        text-align: center;
        font-size: 11px;
        padding-top: 8px;
      }
    </style>
    <div class="receipt">
      <div class="header">
        <div class="brand">J Limbaga's Hitoan &amp; BBQ</div>
        <div class="meta">Location : Matina Aplaya, Davao City</div>
        <div class="order">Order #${receipt.order.orderNumber}</div>
        <div class="meta">Table ${receipt.order.tableNumber || "-"} · ${formatReceiptDate(receipt.order.createdAt?.toDate())}</div>
      </div>

      <div class="section">
        <div class="row"><span>Official Receipt</span></div>
        <div class="row">
          <span>Created</span>
          <span>${dt(receipt.order.createdAt?.toDate())}</span>
        </div>
        <div class="row">
          <span>Paid</span>
          <span>${dt(new Date(receipt.paidAt))}</span>
        </div>
        <div class="row">
          <span>Method</span>
          <span>${receipt.method.toUpperCase()}</span>
        </div>
        <div class="row">
          <span>Discount</span>
          <span>${receipt.discountType === "none" ? "None" : receipt.discountType.toUpperCase()}${
            receipt.discountRate > 0
              ? ` (${Math.round(receipt.discountRate * 100)}%)`
              : ""
          }</span>
        </div>
        ${
          receipt.discountType !== "none"
            ? `<div class="row"><span>Discounted Persons</span><span>${receipt.discountedPersons || 0}/${receipt.totalPersons || 1}</span></div>`
            : ""
        }
        ${
          receipt.method !== "cash" && receipt.transferLast4
            ? `<div class="row"><span>Ref Last 4</span><span>${receipt.transferLast4}</span></div>`
            : ""
        }
      </div>

      <div class="section">
        ${itemRows}
      </div>

      <div class="section">
        <div class="row">
          <span>Subtotal</span>
          <span class="amount">${currencyReceipt(receiptSubtotal)}</span>
        </div>
        <div class="row">
          <span>${getVatLabel(receipt.order.vatEnabled ?? true)}</span>
          <span class="amount">${currencyReceipt(receiptTax)}</span>
        </div>
        <div class="row">
          <span>Total</span>
          <span class="amount">${currencyReceipt(receipt.order.total)}</span>
        </div>
        ${
          receipt.discountAmount > 0
            ? `<div class="row"><span>Discount${
                receipt.discountType !== "none"
                  ? ` (${receipt.discountType === "pwd" ? "PWD" : receipt.discountType === "senior" ? "Senior" : receipt.discountType}${
                      receipt.discountRate > 0
                        ? ` ${Math.round(receipt.discountRate * 100)}%`
                        : ""
                    })`
                  : ""
              }</span><span class="amount">- ${currencyReceipt(receipt.discountAmount)}</span></div>`
            : ""
        }
        <div class="row">
          <span>Amount Due</span>
          <span class="amount">${currencyReceipt(receipt.amountDue)}</span>
        </div>
        <div class="row">
          <span>Amount Paid</span>
          <span class="amount">${currencyReceipt(receipt.amountPaid)}</span>
        </div>
        ${
          receipt.method === "cash"
            ? `<div class="row"><span>Change</span><span class="amount">${currencyReceipt(receipt.change)}</span></div>`
            : ""
        }
      </div>

      <div class="footer">
        Thank you!
        <br />
        ***** Official Receipt *****
        <br />
        ******************************
        <br />
        ******************************
      </div>
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
    <div style="display:flex; justify-content:space-between;"><span>${getVatLabel(billOrder.vatEnabled ?? true)}</span><strong>${currency(billTax)}</strong></div>
    <div style="display:flex; justify-content:space-between;"><span>Total</span><strong>${currency(billOrder.total)}</strong></div>
  `;

  win.document.close();
  win.focus();
  win.print();
}
