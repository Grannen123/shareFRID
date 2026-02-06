/**
 * Fortnox API Client
 *
 * Provides integration with Fortnox for:
 * - Customer sync
 * - Invoice export
 * - Payment status tracking
 */

// Fortnox API types
export interface FortnoxCustomer {
  CustomerNumber: string;
  Name: string;
  OrganisationNumber?: string;
  Address1?: string;
  Address2?: string;
  ZipCode?: string;
  City?: string;
  Email?: string;
  Phone?: string;
  Active: boolean;
}

export interface FortnoxInvoice {
  DocumentNumber?: string;
  CustomerNumber: string;
  CustomerName: string;
  InvoiceDate: string;
  DueDate: string;
  TotalAmount: number;
  TotalVAT: number;
  Currency: string;
  InvoiceRows: FortnoxInvoiceRow[];
  Sent: boolean;
  Booked: boolean;
  Cancelled: boolean;
  Balance: number;
  Comments?: string;
  YourReference?: string;
  OurReference?: string;
}

export interface FortnoxInvoiceRow {
  ArticleNumber?: string;
  Description: string;
  DeliveredQuantity: number;
  Unit?: string;
  Price: number;
  VAT: number;
}

export interface FortnoxPayment {
  Number: string;
  Amount: number;
  PaymentDate: string;
  WriteOffs?: { Amount: number; AccountNumber: number }[];
}

// API configuration
interface FortnoxConfig {
  accessToken: string;
  clientSecret: string;
  baseUrl?: string;
}

// Error class
export class FortnoxApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "FortnoxApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Create Fortnox API client
 */
export function createFortnoxClient(config: FortnoxConfig) {
  const baseUrl = config.baseUrl || "https://api.fortnox.se/3";

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${config.accessToken}`,
    "Client-Secret": config.clientSecret,
  };

  async function fortnoxFetch<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new FortnoxApiError(
        errorData.ErrorInformation?.message ||
          `Fortnox API error: ${response.status}`,
        response.status,
        errorData.ErrorInformation?.code,
      );
    }

    return response.json();
  }

  return {
    // ============================================
    // Customer operations
    // ============================================

    async getCustomers(): Promise<{ Customers: FortnoxCustomer[] }> {
      return fortnoxFetch("/customers");
    },

    async getCustomer(
      customerNumber: string,
    ): Promise<{ Customer: FortnoxCustomer }> {
      return fortnoxFetch(`/customers/${customerNumber}`);
    },

    async createCustomer(
      customer: Omit<FortnoxCustomer, "CustomerNumber">,
    ): Promise<{ Customer: FortnoxCustomer }> {
      return fortnoxFetch("/customers", {
        method: "POST",
        body: JSON.stringify({ Customer: customer }),
      });
    },

    async updateCustomer(
      customerNumber: string,
      updates: Partial<FortnoxCustomer>,
    ): Promise<{ Customer: FortnoxCustomer }> {
      return fortnoxFetch(`/customers/${customerNumber}`, {
        method: "PUT",
        body: JSON.stringify({ Customer: updates }),
      });
    },

    // ============================================
    // Invoice operations
    // ============================================

    async getInvoices(filter?: {
      fromDate?: string;
      toDate?: string;
      customerNumber?: string;
    }): Promise<{ Invoices: FortnoxInvoice[] }> {
      const params = new URLSearchParams();
      if (filter?.fromDate) params.set("fromdate", filter.fromDate);
      if (filter?.toDate) params.set("todate", filter.toDate);
      if (filter?.customerNumber)
        params.set("customernumber", filter.customerNumber);

      const query = params.toString();
      return fortnoxFetch(`/invoices${query ? `?${query}` : ""}`);
    },

    async getInvoice(
      documentNumber: string,
    ): Promise<{ Invoice: FortnoxInvoice }> {
      return fortnoxFetch(`/invoices/${documentNumber}`);
    },

    async createInvoice(
      invoice: Omit<
        FortnoxInvoice,
        "DocumentNumber" | "Sent" | "Booked" | "Cancelled" | "Balance"
      >,
    ): Promise<{ Invoice: FortnoxInvoice }> {
      return fortnoxFetch("/invoices", {
        method: "POST",
        body: JSON.stringify({ Invoice: invoice }),
      });
    },

    async sendInvoice(
      documentNumber: string,
      sendMethod: "Email" | "Print" | "Electronic" = "Email",
    ): Promise<{ Invoice: FortnoxInvoice }> {
      return fortnoxFetch(
        `/invoices/${documentNumber}/${sendMethod.toLowerCase()}`,
      );
    },

    async bookInvoice(
      documentNumber: string,
    ): Promise<{ Invoice: FortnoxInvoice }> {
      return fortnoxFetch(`/invoices/${documentNumber}/bookkeep`, {
        method: "PUT",
      });
    },

    async cancelInvoice(
      documentNumber: string,
    ): Promise<{ Invoice: FortnoxInvoice }> {
      return fortnoxFetch(`/invoices/${documentNumber}/cancel`, {
        method: "PUT",
      });
    },

    // ============================================
    // Payment operations
    // ============================================

    async getInvoicePayments(
      documentNumber: string,
    ): Promise<{ InvoicePayments: FortnoxPayment[] }> {
      return fortnoxFetch(`/invoicepayments?invoicenumber=${documentNumber}`);
    },

    async createPayment(payment: {
      InvoiceNumber: string;
      Amount: number;
      PaymentDate: string;
      ModeOfPayment?: string;
    }): Promise<{ InvoicePayment: FortnoxPayment }> {
      return fortnoxFetch("/invoicepayments", {
        method: "POST",
        body: JSON.stringify({ InvoicePayment: payment }),
      });
    },

    // ============================================
    // Utility methods
    // ============================================

    /**
     * Sync customer from Fortnox to local database
     */
    async syncCustomer(customerNumber: string): Promise<{
      fortnoxCustomer: FortnoxCustomer;
      needsUpdate: boolean;
    }> {
      const { Customer } = await this.getCustomer(customerNumber);
      return {
        fortnoxCustomer: Customer,
        needsUpdate: true, // Logic to compare with local data
      };
    },

    /**
     * Export invoice to Fortnox
     */
    async exportInvoice(invoiceData: {
      customerId: string;
      customerNumber: string;
      period: string;
      lines: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        vat: number;
      }>;
      ourReference?: string;
      yourReference?: string;
    }): Promise<{ documentNumber: string; success: boolean }> {
      const invoice: Omit<
        FortnoxInvoice,
        "DocumentNumber" | "Sent" | "Booked" | "Cancelled" | "Balance"
      > = {
        CustomerNumber: invoiceData.customerNumber,
        CustomerName: "", // Will be filled by Fortnox
        InvoiceDate: new Date().toISOString().split("T")[0],
        DueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        TotalAmount: invoiceData.lines.reduce(
          (sum, l) => sum + l.quantity * l.unitPrice,
          0,
        ),
        TotalVAT: invoiceData.lines.reduce(
          (sum, l) => sum + l.quantity * l.unitPrice * (l.vat / 100),
          0,
        ),
        Currency: "SEK",
        InvoiceRows: invoiceData.lines.map((line) => ({
          Description: line.description,
          DeliveredQuantity: line.quantity,
          Price: line.unitPrice,
          VAT: line.vat,
        })),
        OurReference: invoiceData.ourReference,
        YourReference: invoiceData.yourReference,
      };

      const { Invoice } = await this.createInvoice(invoice);

      return {
        documentNumber: Invoice.DocumentNumber || "",
        success: true,
      };
    },

    /**
     * Check payment status for an invoice
     */
    async getPaymentStatus(documentNumber: string): Promise<{
      isPaid: boolean;
      paidAmount: number;
      remainingAmount: number;
      payments: FortnoxPayment[];
    }> {
      const [invoiceResult, paymentsResult] = await Promise.all([
        this.getInvoice(documentNumber),
        this.getInvoicePayments(documentNumber),
      ]);

      const invoice = invoiceResult.Invoice;
      const payments = paymentsResult.InvoicePayments || [];
      const paidAmount = payments.reduce((sum, p) => sum + p.Amount, 0);

      return {
        isPaid: invoice.Balance === 0,
        paidAmount,
        remainingAmount: invoice.Balance,
        payments,
      };
    },
  };
}

export type FortnoxClient = ReturnType<typeof createFortnoxClient>;
