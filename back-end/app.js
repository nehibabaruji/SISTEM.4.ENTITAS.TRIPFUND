(function initializeTripFundSupabase() {
const SUPABASE_URL = 'https://hyutdmborkfuiyjfsviq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_dnnxMn1y00FYdMPCJJ3O8Q_LszhdGFe';
const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  SUPABASE_URL.startsWith('http') &&
  !SUPABASE_URL.includes('YOUR_') &&
  !SUPABASE_ANON_KEY.includes('YOUR_')
);

if (!isSupabaseConfigured) {
  console.warn('TripFund: update Supabase URL dan publishable key di back-end/app.js sebelum menjalankan aplikasi.');
}

const supabase = isSupabaseConfigured && window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

if (!window.supabase) {
  console.error('TripFund: Supabase Client gagal dimuat dari CDN. Periksa koneksi internet.');
}

function assertSupabaseReady() {
  if (!supabase) {
    throw new Error('Konfigurasi Supabase belum siap. Masukkan URL dan publishable key di back-end/app.js.');
  }
}

function handleSupabaseError(operation, error) {
  let message = error?.message || 'Unknown database error';
  if (error?.code === '42501' || /row-level security|permission denied/i.test(message)) {
    message = 'Supabase menolak akses database. Jalankan ulang back-end/database.sql di SQL Editor untuk menerapkan kebijakan RLS dan hak akses terbaru.';
  } else if (error?.code === '23503') {
    message = 'Data tidak dapat dihapus karena masih digunakan oleh transaksi.';
  } else if (error?.code === '23505') {
    message = 'Kode tersebut sudah digunakan. Masukkan kode yang berbeda.';
  }
  console.error(`[TripFund] ${operation} failed:`, message);
  throw new Error(message);
}

function isValidText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateRecord(record, entityName) {
  if (!record || typeof record !== 'object') {
    throw new Error(`Data ${entityName} tidak valid.`);
  }
}

async function getCustomers() {
  assertSupabaseReady();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) handleSupabaseError('getCustomers', error);
  return data ?? [];
}

async function createCustomer(data) {
  assertSupabaseReady();
  validateRecord(data, 'customer');
  if (!isValidText(data.customer_code)) throw new Error('Kode pelanggan wajib diisi.');
  if (!isValidText(data.full_name)) throw new Error('Nama pelanggan wajib diisi.');
  if (!isValidText(data.phone)) throw new Error('Nomor telepon wajib diisi.');

  const payload = {
    customer_code: data.customer_code.trim(),
    full_name: data.full_name.trim(),
    phone: data.phone.trim(),
    email: data.email ? data.email.trim() : null,
  };

  const { data: created, error } = await supabase.from('customers').insert(payload).select().single();
  if (error) handleSupabaseError('createCustomer', error);
  return created;
}

async function updateCustomer(id, data) {
  assertSupabaseReady();
  validateRecord(data, 'customer');
  if (!id) throw new Error('ID pelanggan tidak valid.');
  if (!isValidText(data.customer_code)) throw new Error('Kode pelanggan wajib diisi.');
  if (!isValidText(data.full_name)) throw new Error('Nama pelanggan wajib diisi.');
  if (!isValidText(data.phone)) throw new Error('Nomor telepon wajib diisi.');

  const payload = {
    customer_code: data.customer_code.trim(),
    full_name: data.full_name.trim(),
    phone: data.phone.trim(),
    email: data.email ? data.email.trim() : null,
  };

  const { data: updated, error } = await supabase.from('customers').update(payload).eq('id', id).select().single();
  if (error) handleSupabaseError('updateCustomer', error);
  return updated;
}

async function deleteCustomer(id) {
  assertSupabaseReady();
  if (!id) throw new Error('ID pelanggan tidak valid.');
  const { data, error } = await supabase.from('customers').delete().eq('id', id).select('id').maybeSingle();
  if (error) handleSupabaseError('deleteCustomer', error);
  if (!data) throw new Error('Pelanggan tidak ditemukan atau penghapusan tidak diizinkan.');
  return true;
}

async function getVendors() {
  assertSupabaseReady();
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) handleSupabaseError('getVendors', error);
  return data ?? [];
}

async function createVendor(data) {
  assertSupabaseReady();
  validateRecord(data, 'vendor');
  if (!isValidText(data.vendor_code)) throw new Error('Kode vendor wajib diisi.');
  if (!isValidText(data.vendor_name)) throw new Error('Nama vendor wajib diisi.');
  if (!isValidText(data.service_type)) throw new Error('Jenis layanan wajib diisi.');
  if (!isValidText(data.phone)) throw new Error('Nomor telepon vendor wajib diisi.');

  const payload = {
    vendor_code: data.vendor_code.trim(),
    vendor_name: data.vendor_name.trim(),
    service_type: data.service_type.trim(),
    phone: data.phone.trim(),
  };

  const { data: created, error } = await supabase.from('vendors').insert(payload).select().single();
  if (error) handleSupabaseError('createVendor', error);
  return created;
}

async function updateVendor(id, data) {
  assertSupabaseReady();
  validateRecord(data, 'vendor');
  if (!id) throw new Error('ID vendor tidak valid.');
  if (!isValidText(data.vendor_code)) throw new Error('Kode vendor wajib diisi.');
  if (!isValidText(data.vendor_name)) throw new Error('Nama vendor wajib diisi.');
  if (!isValidText(data.service_type)) throw new Error('Jenis layanan wajib diisi.');
  if (!isValidText(data.phone)) throw new Error('Nomor telepon vendor wajib diisi.');

  const payload = {
    vendor_code: data.vendor_code.trim(),
    vendor_name: data.vendor_name.trim(),
    service_type: data.service_type.trim(),
    phone: data.phone.trim(),
  };

  const { data: updated, error } = await supabase.from('vendors').update(payload).eq('id', id).select().single();
  if (error) handleSupabaseError('updateVendor', error);
  return updated;
}

async function deleteVendor(id) {
  assertSupabaseReady();
  if (!id) throw new Error('ID vendor tidak valid.');
  const { data, error } = await supabase.from('vendors').delete().eq('id', id).select('id').maybeSingle();
  if (error) handleSupabaseError('deleteVendor', error);
  if (!data) throw new Error('Vendor tidak ditemukan atau penghapusan tidak diizinkan.');
  return true;
}

async function getCustomerDeposits(filters = {}) {
  assertSupabaseReady();
  let query = supabase
    .from('customer_deposits')
    .select('*, customers(full_name, customer_code)')
    .order('payment_date', { ascending: false });

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.customerId) query = query.eq('customer_id', filters.customerId);
  if (filters.search) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`deposit_code.ilike.${term},trip_name.ilike.${term}`);
  }
  if (filters.startDate) query = query.gte('payment_date', filters.startDate);
  if (filters.endDate) query = query.lte('payment_date', filters.endDate);

  const { data, error } = await query;
  if (error) handleSupabaseError('getCustomerDeposits', error);
  return data ?? [];
}

async function createCustomerDeposit(data) {
  assertSupabaseReady();
  validateRecord(data, 'deposit');
  if (!isValidText(data.deposit_code)) throw new Error('Kode deposit wajib diisi.');
  if (!isValidText(data.trip_name)) throw new Error('Nama perjalanan wajib diisi.');
  if (!data.customer_id) throw new Error('Pelanggan wajib dipilih.');
  if (!Number(data.deposit_amount) || Number(data.deposit_amount) <= 0) {
    throw new Error('Nominal deposit harus lebih besar dari 0.');
  }
  if (!data.payment_date) throw new Error('Tanggal pembayaran wajib dipilih.');
  if (!isValidText(data.payment_method)) throw new Error('Metode pembayaran wajib dipilih.');
  if (!isValidText(data.status)) throw new Error('Status transaksi wajib dipilih.');

  const payload = {
    deposit_code: data.deposit_code.trim(),
    customer_id: data.customer_id,
    trip_name: data.trip_name.trim(),
    deposit_amount: Number(data.deposit_amount),
    payment_date: data.payment_date,
    payment_method: data.payment_method,
    status: data.status,
    notes: data.notes ? data.notes.trim() : null,
  };

  const { data: created, error } = await supabase.from('customer_deposits').insert(payload).select().single();
  if (error) handleSupabaseError('createCustomerDeposit', error);
  return created;
}

async function updateCustomerDeposit(id, data) {
  assertSupabaseReady();
  validateRecord(data, 'deposit');
  if (!id) throw new Error('ID deposit tidak valid.');
  if (!isValidText(data.deposit_code)) throw new Error('Kode deposit wajib diisi.');
  if (!isValidText(data.trip_name)) throw new Error('Nama perjalanan wajib diisi.');
  if (!data.customer_id) throw new Error('Pelanggan wajib dipilih.');
  if (!Number(data.deposit_amount) || Number(data.deposit_amount) <= 0) {
    throw new Error('Nominal deposit harus lebih besar dari 0.');
  }
  if (!data.payment_date) throw new Error('Tanggal pembayaran wajib dipilih.');
  if (!isValidText(data.payment_method)) throw new Error('Metode pembayaran wajib dipilih.');
  if (!isValidText(data.status)) throw new Error('Status transaksi wajib dipilih.');

  const payload = {
    deposit_code: data.deposit_code.trim(),
    customer_id: data.customer_id,
    trip_name: data.trip_name.trim(),
    deposit_amount: Number(data.deposit_amount),
    payment_date: data.payment_date,
    payment_method: data.payment_method,
    status: data.status,
    notes: data.notes ? data.notes.trim() : null,
  };

  const { data: updated, error } = await supabase.from('customer_deposits').update(payload).eq('id', id).select().single();
  if (error) handleSupabaseError('updateCustomerDeposit', error);
  return updated;
}

async function cancelCustomerDeposit(id) {
  assertSupabaseReady();
  if (!id) throw new Error('ID deposit tidak valid.');
  const { data, error } = await supabase.from('customer_deposits').update({ status: 'cancelled' }).eq('id', id).select().single();
  if (error) handleSupabaseError('cancelCustomerDeposit', error);
  return data;
}

async function getVendorAdvancePayments(filters = {}) {
  assertSupabaseReady();
  let query = supabase
    .from('vendor_advance_payments')
    .select('*, vendors(vendor_name, vendor_code, service_type)')
    .order('payment_date', { ascending: false });

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.vendorId) query = query.eq('vendor_id', filters.vendorId);
  if (filters.search) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`payment_code.ilike.${term},trip_name.ilike.${term}`);
  }
  if (filters.startDate) query = query.gte('payment_date', filters.startDate);
  if (filters.endDate) query = query.lte('payment_date', filters.endDate);

  const { data, error } = await query;
  if (error) handleSupabaseError('getVendorAdvancePayments', error);
  return data ?? [];
}

async function createVendorAdvancePayment(data) {
  assertSupabaseReady();
  validateRecord(data, 'vendor advance payment');
  if (!isValidText(data.payment_code)) throw new Error('Kode pembayaran vendor wajib diisi.');
  if (!isValidText(data.trip_name)) throw new Error('Nama perjalanan wajib diisi.');
  if (!data.vendor_id) throw new Error('Vendor wajib dipilih.');
  if (!Number(data.advance_amount) || Number(data.advance_amount) <= 0) {
    throw new Error('Nominal uang muka harus lebih besar dari 0.');
  }
  if (!data.payment_date) throw new Error('Tanggal pembayaran wajib dipilih.');
  if (!isValidText(data.payment_method)) throw new Error('Metode pembayaran wajib dipilih.');
  if (!isValidText(data.status)) throw new Error('Status transaksi wajib dipilih.');

  const payload = {
    payment_code: data.payment_code.trim(),
    vendor_id: data.vendor_id,
    trip_name: data.trip_name.trim(),
    advance_amount: Number(data.advance_amount),
    payment_date: data.payment_date,
    payment_method: data.payment_method,
    status: data.status,
    notes: data.notes ? data.notes.trim() : null,
  };

  const { data: created, error } = await supabase.from('vendor_advance_payments').insert(payload).select().single();
  if (error) handleSupabaseError('createVendorAdvancePayment', error);
  return created;
}

async function updateVendorAdvancePayment(id, data) {
  assertSupabaseReady();
  validateRecord(data, 'vendor advance payment');
  if (!id) throw new Error('ID pembayaran vendor tidak valid.');
  if (!isValidText(data.payment_code)) throw new Error('Kode pembayaran vendor wajib diisi.');
  if (!isValidText(data.trip_name)) throw new Error('Nama perjalanan wajib diisi.');
  if (!data.vendor_id) throw new Error('Vendor wajib dipilih.');
  if (!Number(data.advance_amount) || Number(data.advance_amount) <= 0) {
    throw new Error('Nominal uang muka harus lebih besar dari 0.');
  }
  if (!data.payment_date) throw new Error('Tanggal pembayaran wajib dipilih.');
  if (!isValidText(data.payment_method)) throw new Error('Metode pembayaran wajib dipilih.');
  if (!isValidText(data.status)) throw new Error('Status transaksi wajib dipilih.');

  const payload = {
    payment_code: data.payment_code.trim(),
    vendor_id: data.vendor_id,
    trip_name: data.trip_name.trim(),
    advance_amount: Number(data.advance_amount),
    payment_date: data.payment_date,
    payment_method: data.payment_method,
    status: data.status,
    notes: data.notes ? data.notes.trim() : null,
  };

  const { data: updated, error } = await supabase.from('vendor_advance_payments').update(payload).eq('id', id).select().single();
  if (error) handleSupabaseError('updateVendorAdvancePayment', error);
  return updated;
}

async function cancelVendorAdvancePayment(id) {
  assertSupabaseReady();
  if (!id) throw new Error('ID pembayaran vendor tidak valid.');
  const { data, error } = await supabase.from('vendor_advance_payments').update({ status: 'cancelled' }).eq('id', id).select().single();
  if (error) handleSupabaseError('cancelVendorAdvancePayment', error);
  return data;
}

async function getDashboardSummary() {
  assertSupabaseReady();
  const [depositResult, vendorResult] = await Promise.all([
    supabase.from('customer_deposits').select('deposit_amount, status'),
    supabase.from('vendor_advance_payments').select('advance_amount, status')
  ]);

  if (depositResult.error) handleSupabaseError('getDashboardSummary.customer_deposits', depositResult.error);
  if (vendorResult.error) handleSupabaseError('getDashboardSummary.vendor_advance_payments', vendorResult.error);

  const deposits = depositResult.data ?? [];
  const vendorPayments = vendorResult.data ?? [];

  const totalPaidDeposits = deposits
    .filter((item) => item.status === 'paid')
    .reduce((sum, item) => sum + Number(item.deposit_amount || 0), 0);

  const totalPaidVendorAdvance = vendorPayments
    .filter((item) => item.status === 'paid')
    .reduce((sum, item) => sum + Number(item.advance_amount || 0), 0);

  const customerDepositCount = deposits.length;
  const vendorPaymentCount = vendorPayments.length;
  const pendingTransactions = [...deposits, ...vendorPayments].filter((item) => item.status === 'pending').length;

  return {
    totalCustomerDepositsPaid: totalPaidDeposits,
    totalVendorAdvancePaid: totalPaidVendorAdvance,
    netRecordedBalance: totalPaidDeposits - totalPaidVendorAdvance,
    customerDepositCount,
    vendorAdvanceCount: vendorPaymentCount,
    pendingTransactions,
  };
}

async function ensureExampleSetup() {
  return {
    ok: true,
    message: 'Supabase config placeholder siap digunakan. Masukkan project URL dan publishable key nyata sebelum menjalankan aplikasi.'
  };
}

window.TripFundAPI = {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  getCustomerDeposits,
  createCustomerDeposit,
  updateCustomerDeposit,
  cancelCustomerDeposit,
  getVendorAdvancePayments,
  createVendorAdvancePayment,
  updateVendorAdvancePayment,
  cancelVendorAdvancePayment,
  getDashboardSummary,
};
})();
