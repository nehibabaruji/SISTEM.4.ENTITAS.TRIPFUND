const {
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
} = window.TripFundAPI || {};

const state = {
  customers: [],
  vendors: [],
  customerDeposits: [],
  vendorAdvances: [],
  summary: {},
};

const ui = {
  navItems: document.querySelectorAll('.nav-item'),
  sections: document.querySelectorAll('.page-section'),
  pageTitle: document.getElementById('page-title'),
  currentDate: document.getElementById('current-date'),
  notification: document.getElementById('notification'),
  modalBackdrop: document.getElementById('modal-backdrop'),
  modalTitle: document.getElementById('modal-title'),
  modalFormBody: document.getElementById('modal-form-body'),
  entityForm: document.getElementById('entity-form'),
  closeModalButton: document.getElementById('close-modal-button'),
  cancelFormButton: document.getElementById('cancel-form-button'),
  totalDepositPaid: document.getElementById('total-deposit-paid'),
  totalAdvancePaid: document.getElementById('total-advance-paid'),
  netBalance: document.getElementById('net-balance'),
  depositCount: document.getElementById('deposit-count'),
  advanceCount: document.getElementById('advance-count'),
  pendingCount: document.getElementById('pending-count'),
  customerTableBody: document.getElementById('customers-table-body'),
  vendorTableBody: document.getElementById('vendors-table-body'),
  depositTableBody: document.getElementById('deposits-table-body'),
  advanceTableBody: document.getElementById('vendor-advances-table-body'),
  customerSearch: document.getElementById('customer-search'),
  vendorSearch: document.getElementById('vendor-search'),
  depositSearch: document.getElementById('deposit-search'),
  advanceSearch: document.getElementById('advance-search'),
  depositStatusFilter: document.getElementById('deposit-status-filter'),
  advanceStatusFilter: document.getElementById('advance-status-filter'),
  depositStartDate: document.getElementById('deposit-start-date'),
  depositEndDate: document.getElementById('deposit-end-date'),
  advanceStartDate: document.getElementById('advance-start-date'),
  advanceEndDate: document.getElementById('advance-end-date'),
};

const statusOptions = ['pending', 'paid', 'cancelled'];
const paymentMethods = ['transfer_bank', 'tunai', 'kartu', 'ewallet', 'lainnya'];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function renderDateNow() {
  const now = new Date();
  ui.currentDate.textContent = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(now);
}

function showNotification(message, type = 'success') {
  ui.notification.textContent = message;
  ui.notification.className = `notification show ${type}`;
  window.clearTimeout(showNotification.timeoutId);
  showNotification.timeoutId = window.setTimeout(() => {
    ui.notification.className = 'notification';
  }, 3000);
}

function setActiveSection(sectionId) {
  ui.navItems.forEach((item) => {
    const active = item.dataset.section === sectionId;
    item.classList.toggle('active', active);
  });

  ui.sections.forEach((section) => {
    section.classList.toggle('active', section.id === `${sectionId}-section`);
  });

  const pageNames = {
    dashboard: 'Dashboard',
    customers: 'Data Pelanggan',
    vendors: 'Data Vendor',
    deposits: 'Deposit Pelanggan',
    'vendor-advances': 'Uang Muka Vendor',
  };

  ui.pageTitle.textContent = pageNames[sectionId] || 'Dashboard';
}

async function loadDashboard() {
  const summary = await getDashboardSummary();
  state.summary = summary;

  ui.totalDepositPaid.textContent = formatCurrency(summary.totalCustomerDepositsPaid);
  ui.totalAdvancePaid.textContent = formatCurrency(summary.totalVendorAdvancePaid);
  ui.netBalance.textContent = formatCurrency(summary.netRecordedBalance);
  ui.depositCount.textContent = String(summary.customerDepositCount);
  ui.advanceCount.textContent = String(summary.vendorAdvanceCount);
  ui.pendingCount.textContent = String(summary.pendingTransactions);
}

async function loadCustomers() {
  state.customers = await getCustomers();
  renderCustomers();
}

function renderCustomers() {
  const searchTerm = ui.customerSearch.value.trim().toLowerCase();
  const filtered = state.customers.filter((customer) => {
    const haystack = `${customer.customer_code} ${customer.full_name}`.toLowerCase();
    return haystack.includes(searchTerm);
  });

  if (!filtered.length) {
    ui.customerTableBody.innerHTML = '<tr><td colspan="6"><div class="empty-state">Tidak ada data pelanggan.</div></td></tr>';
    return;
  }

  ui.customerTableBody.innerHTML = filtered
    .map(
      (customer) => `
        <tr>
          <td>${escapeHtml(customer.customer_code)}</td>
          <td>${escapeHtml(customer.full_name)}</td>
          <td>${escapeHtml(customer.phone)}</td>
          <td>${escapeHtml(customer.email || '-')}</td>
          <td>${escapeHtml(formatDate(customer.created_at))}</td>
          <td>
            <div class="row-actions">
              <button class="action-button" data-action="edit" data-type="customers" data-id="${customer.id}">Edit</button>
              <button class="cancel-button" data-action="delete" data-type="customers" data-id="${customer.id}">Hapus</button>
            </div>
          </td>
        </tr>
      `
    )
    .join('');
}

async function loadVendors() {
  state.vendors = await getVendors();
  renderVendors();
}

function renderVendors() {
  const searchTerm = ui.vendorSearch.value.trim().toLowerCase();
  const filtered = state.vendors.filter((vendor) => {
    const haystack = `${vendor.vendor_code} ${vendor.vendor_name}`.toLowerCase();
    return haystack.includes(searchTerm);
  });

  if (!filtered.length) {
    ui.vendorTableBody.innerHTML = '<tr><td colspan="6"><div class="empty-state">Tidak ada data vendor.</div></td></tr>';
    return;
  }

  ui.vendorTableBody.innerHTML = filtered
    .map(
      (vendor) => `
        <tr>
          <td>${escapeHtml(vendor.vendor_code)}</td>
          <td>${escapeHtml(vendor.vendor_name)}</td>
          <td>${escapeHtml(vendor.service_type)}</td>
          <td>${escapeHtml(vendor.phone)}</td>
          <td>${escapeHtml(formatDate(vendor.created_at))}</td>
          <td>
            <div class="row-actions">
              <button class="action-button" data-action="edit" data-type="vendors" data-id="${vendor.id}">Edit</button>
              <button class="cancel-button" data-action="delete" data-type="vendors" data-id="${vendor.id}">Hapus</button>
            </div>
          </td>
        </tr>
      `
    )
    .join('');
}

async function loadCustomerDeposits() {
  const filters = {
    status: ui.depositStatusFilter.value,
    startDate: ui.depositStartDate.value,
    endDate: ui.depositEndDate.value,
    search: ui.depositSearch.value,
  };

  state.customerDeposits = await getCustomerDeposits(filters);
  renderCustomerDeposits();
}

function renderCustomerDeposits() {
  const rows = state.customerDeposits;
  if (!rows.length) {
    ui.depositTableBody.innerHTML = '<tr><td colspan="8"><div class="empty-state">Tidak ada transaksi deposit.</div></td></tr>';
    return;
  }

  ui.depositTableBody.innerHTML = rows
    .map((deposit) => {
      const customerName = deposit.customers?.full_name || 'Pelanggan tidak ditemukan';
      return `
        <tr>
          <td>${escapeHtml(deposit.deposit_code)}</td>
          <td>${escapeHtml(customerName)}</td>
          <td>${escapeHtml(deposit.trip_name)}</td>
          <td>${escapeHtml(formatCurrency(deposit.deposit_amount))}</td>
          <td>${escapeHtml(formatDate(deposit.payment_date))}</td>
          <td>${escapeHtml(deposit.payment_method)}</td>
          <td><span class="badge ${deposit.status}">${escapeHtml(deposit.status)}</span></td>
          <td>
            <div class="row-actions">
              <button class="action-button" data-action="edit" data-type="customerDeposits" data-id="${deposit.id}">Edit</button>
              <button class="action-button" data-action="cancel" data-type="customerDeposits" data-id="${deposit.id}">Batalkan</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

async function loadVendorAdvances() {
  const filters = {
    status: ui.advanceStatusFilter.value,
    startDate: ui.advanceStartDate.value,
    endDate: ui.advanceEndDate.value,
    search: ui.advanceSearch.value,
  };

  state.vendorAdvances = await getVendorAdvancePayments(filters);
  renderVendorAdvances();
}

function renderVendorAdvances() {
  const rows = state.vendorAdvances;
  if (!rows.length) {
    ui.advanceTableBody.innerHTML = '<tr><td colspan="8"><div class="empty-state">Tidak ada transaksi uang muka.</div></td></tr>';
    return;
  }

  ui.advanceTableBody.innerHTML = rows
    .map((payment) => {
      const vendorName = payment.vendors?.vendor_name || 'Vendor tidak ditemukan';
      return `
        <tr>
          <td>${escapeHtml(payment.payment_code)}</td>
          <td>${escapeHtml(vendorName)}</td>
          <td>${escapeHtml(payment.trip_name)}</td>
          <td>${escapeHtml(formatCurrency(payment.advance_amount))}</td>
          <td>${escapeHtml(formatDate(payment.payment_date))}</td>
          <td>${escapeHtml(payment.payment_method)}</td>
          <td><span class="badge ${payment.status}">${escapeHtml(payment.status)}</span></td>
          <td>
            <div class="row-actions">
              <button class="action-button" data-action="edit" data-type="vendorAdvances" data-id="${payment.id}">Edit</button>
              <button class="action-button" data-action="cancel" data-type="vendorAdvances" data-id="${payment.id}">Batalkan</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

function openModal(type, record = null) {
  ui.modalBackdrop.classList.remove('hidden');
  ui.modalBackdrop.setAttribute('aria-hidden', 'false');

  const modalConfig = {
    customers: {
      title: record ? 'Edit Pelanggan' : 'Tambah Pelanggan',
      fields: [
        { name: 'customer_code', label: 'Kode Pelanggan', type: 'text', value: record?.customer_code || '', required: true },
        { name: 'full_name', label: 'Nama Lengkap', type: 'text', value: record?.full_name || '', required: true },
        { name: 'phone', label: 'Nomor Telepon', type: 'tel', value: record?.phone || '', required: true },
        { name: 'email', label: 'Email', type: 'email', value: record?.email || '', required: false },
      ],
    },
    vendors: {
      title: record ? 'Edit Vendor' : 'Tambah Vendor',
      fields: [
        { name: 'vendor_code', label: 'Kode Vendor', type: 'text', value: record?.vendor_code || '', required: true },
        { name: 'vendor_name', label: 'Nama Vendor', type: 'text', value: record?.vendor_name || '', required: true },
        { name: 'service_type', label: 'Jenis Layanan', type: 'text', value: record?.service_type || '', required: true },
        { name: 'phone', label: 'Nomor Telepon', type: 'tel', value: record?.phone || '', required: true },
      ],
    },
    customerDeposits: {
      title: record ? 'Edit Deposit' : 'Tambah Deposit',
      fields: [
        { name: 'deposit_code', label: 'Kode Deposit', type: 'text', value: record?.deposit_code || '', required: true },
        { name: 'customer_id', label: 'Pelanggan', type: 'select', options: state.customers, optionValue: 'id', optionLabel: 'full_name', value: record?.customer_id || '', required: true },
        { name: 'trip_name', label: 'Nama Perjalanan', type: 'text', value: record?.trip_name || '', required: true },
        { name: 'deposit_amount', label: 'Nominal Deposit', type: 'number', value: record?.deposit_amount || '', required: true, min: 1 },
        { name: 'payment_date', label: 'Tanggal Pembayaran', type: 'date', value: record?.payment_date || '', required: true },
        { name: 'payment_method', label: 'Metode Pembayaran', type: 'select', options: paymentMethods.map((method) => ({ value: method, label: method.replace('_', ' ') })), optionValue: 'value', optionLabel: 'label', value: record?.payment_method || '', required: true },
        { name: 'status', label: 'Status', type: 'select', options: statusOptions.map((status) => ({ value: status, label: status })), optionValue: 'value', optionLabel: 'label', value: record?.status || 'pending', required: true },
        { name: 'notes', label: 'Catatan', type: 'textarea', value: record?.notes || '', required: false, fullSpan: true },
      ],
    },
    vendorAdvances: {
      title: record ? 'Edit Uang Muka Vendor' : 'Tambah Uang Muka Vendor',
      fields: [
        { name: 'payment_code', label: 'Kode Pembayaran', type: 'text', value: record?.payment_code || '', required: true },
        { name: 'vendor_id', label: 'Vendor', type: 'select', options: state.vendors, optionValue: 'id', optionLabel: 'vendor_name', value: record?.vendor_id || '', required: true },
        { name: 'trip_name', label: 'Nama Perjalanan', type: 'text', value: record?.trip_name || '', required: true },
        { name: 'advance_amount', label: 'Nominal Uang Muka', type: 'number', value: record?.advance_amount || '', required: true, min: 1 },
        { name: 'payment_date', label: 'Tanggal Pembayaran', type: 'date', value: record?.payment_date || '', required: true },
        { name: 'payment_method', label: 'Metode Pembayaran', type: 'select', options: paymentMethods.map((method) => ({ value: method, label: method.replace('_', ' ') })), optionValue: 'value', optionLabel: 'label', value: record?.payment_method || '', required: true },
        { name: 'status', label: 'Status', type: 'select', options: statusOptions.map((status) => ({ value: status, label: status })), optionValue: 'value', optionLabel: 'label', value: record?.status || 'pending', required: true },
        { name: 'notes', label: 'Catatan', type: 'textarea', value: record?.notes || '', required: false, fullSpan: true },
      ],
    },
  };

  const config = modalConfig[type];
  if (!config) return;

  ui.modalTitle.textContent = config.title;
  ui.modalFormBody.innerHTML = '';

  const formGrid = document.createElement('div');
  formGrid.className = 'form-grid';

  config.fields.forEach((field) => {
    const group = document.createElement('div');
    group.className = `form-group ${field.fullSpan ? 'full-span' : ''}`;

    const label = document.createElement('label');
    label.textContent = `${field.label}${field.required ? ' *' : ''}`;
    label.setAttribute('for', field.name);

    let input;
    if (field.type === 'select') {
      input = document.createElement('select');
      input.name = field.name;
      input.id = field.name;
      input.required = Boolean(field.required);
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = field.name.includes('customer') || field.name.includes('vendor') ? 'Pilih data' : 'Pilih opsi';
      input.appendChild(placeholder);
      (field.options || []).forEach((option) => {
        const optionEl = document.createElement('option');
        optionEl.value = option[field.optionValue];
        optionEl.textContent = option[field.optionLabel];
        optionEl.selected = String(option[field.optionValue]) === String(field.value);
        input.appendChild(optionEl);
      });
    } else if (field.type === 'textarea') {
      input = document.createElement('textarea');
      input.name = field.name;
      input.id = field.name;
      input.required = Boolean(field.required);
      input.value = field.value || '';
    } else {
      input = document.createElement('input');
      input.type = field.type;
      input.name = field.name;
      input.id = field.name;
      input.required = Boolean(field.required);
      input.value = field.value || '';
      if (field.min) input.min = String(field.min);
    }

    group.appendChild(label);
    group.appendChild(input);
    formGrid.appendChild(group);
  });

  ui.modalFormBody.appendChild(formGrid);
  ui.entityForm.dataset.type = type;
  ui.entityForm.dataset.recordId = record?.id || '';
}

function closeModal() {
  ui.modalBackdrop.classList.add('hidden');
  ui.modalBackdrop.setAttribute('aria-hidden', 'true');
  ui.entityForm.reset();
}

function getFormData(form) {
  const formData = new FormData(form);
  const record = Object.fromEntries(formData.entries());
  return record;
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const submitButton = ui.entityForm.querySelector('button[type="submit"]');
  if (submitButton.disabled) return;
  submitButton.disabled = true;
  const type = ui.entityForm.dataset.type;
  const recordId = ui.entityForm.dataset.recordId;
  const data = getFormData(ui.entityForm);

  try {
    if (type === 'customers') {
      if (recordId) {
        await updateCustomer(recordId, data);
        showNotification('Data pelanggan berhasil diperbarui.', 'success');
      } else {
        await createCustomer(data);
        showNotification('Data pelanggan berhasil ditambahkan.', 'success');
      }
      await loadCustomers();
    } else if (type === 'vendors') {
      if (recordId) {
        await updateVendor(recordId, data);
        showNotification('Data vendor berhasil diperbarui.', 'success');
      } else {
        await createVendor(data);
        showNotification('Data vendor berhasil ditambahkan.', 'success');
      }
      await loadVendors();
    } else if (type === 'customerDeposits') {
      if (recordId) {
        await updateCustomerDeposit(recordId, data);
        showNotification('Deposit berhasil diperbarui.', 'success');
      } else {
        await createCustomerDeposit(data);
        showNotification('Deposit berhasil ditambahkan.', 'success');
      }
      await loadCustomerDeposits();
    } else if (type === 'vendorAdvances') {
      if (recordId) {
        await updateVendorAdvancePayment(recordId, data);
        showNotification('Uang muka vendor berhasil diperbarui.', 'success');
      } else {
        await createVendorAdvancePayment(data);
        showNotification('Uang muka vendor berhasil ditambahkan.', 'success');
      }
      await loadVendorAdvances();
    }

    await loadDashboard();
    closeModal();
  } catch (error) {
    showNotification(error.message || 'Operasi gagal.', 'error');
  } finally {
    submitButton.disabled = false;
  }
}

async function handleDelete(type, id) {
  if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;

  try {
    if (type === 'customers') {
      await deleteCustomer(id);
      showNotification('Pelanggan berhasil dihapus.', 'success');
      await loadCustomers();
    } else if (type === 'vendors') {
      await deleteVendor(id);
      showNotification('Vendor berhasil dihapus.', 'success');
      await loadVendors();
    }
    await loadDashboard();
  } catch (error) {
    showNotification(error.message || 'Penghapusan gagal.', 'error');
  }
}

async function handleCancel(type, id) {
  try {
    if (type === 'customerDeposits') {
      await cancelCustomerDeposit(id);
      showNotification('Deposit berhasil dibatalkan.', 'success');
      await loadCustomerDeposits();
    } else if (type === 'vendorAdvances') {
      await cancelVendorAdvancePayment(id);
      showNotification('Uang muka vendor berhasil dibatalkan.', 'success');
      await loadVendorAdvances();
    }
    await loadDashboard();
  } catch (error) {
    showNotification(error.message || 'Pembatalan gagal.', 'error');
  }
}

async function handleTableAction(event) {
  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget) return;

  const { action, type, id } = actionTarget.dataset;
  if (!id) return;

  if (action === 'delete') {
    await handleDelete(type, id);
    return;
  }

  if (action === 'cancel') {
    await handleCancel(type, id);
    return;
  }

  if (action === 'edit') {
    const entityMap = {
      customers: state.customers.find((item) => item.id === id),
      vendors: state.vendors.find((item) => item.id === id),
      customerDeposits: state.customerDeposits.find((item) => item.id === id),
      vendorAdvances: state.vendorAdvances.find((item) => item.id === id),
    };

    openModal(type, entityMap[type]);
  }
}

function bindEvents() {
  ui.navItems.forEach((item) => {
    item.addEventListener('click', () => setActiveSection(item.dataset.section));
  });

  document.querySelectorAll('[data-add-type]').forEach((button) => {
    button.addEventListener('click', () => {
      const type = button.dataset.addType;
      openModal(type);
    });
  });

  ui.closeModalButton.addEventListener('click', closeModal);
  ui.cancelFormButton.addEventListener('click', closeModal);
  ui.modalBackdrop.addEventListener('click', (event) => {
    if (event.target === ui.modalBackdrop) closeModal();
  });
  ui.entityForm.addEventListener('submit', handleFormSubmit);
  document.addEventListener('click', handleTableAction);

  ui.customerSearch.addEventListener('input', renderCustomers);
  ui.vendorSearch.addEventListener('input', renderVendors);
  ui.depositSearch.addEventListener('input', () => loadCustomerDeposits());
  ui.advanceSearch.addEventListener('input', () => loadVendorAdvances());
  ui.depositStatusFilter.addEventListener('change', () => loadCustomerDeposits());
  ui.advanceStatusFilter.addEventListener('change', () => loadVendorAdvances());
  ui.depositStartDate.addEventListener('change', () => loadCustomerDeposits());
  ui.depositEndDate.addEventListener('change', () => loadCustomerDeposits());
  ui.advanceStartDate.addEventListener('change', () => loadVendorAdvances());
  ui.advanceEndDate.addEventListener('change', () => loadVendorAdvances());
}

async function loadApplicationData() {
  try {
    await Promise.all([
      loadDashboard(),
      loadCustomers(),
      loadVendors(),
      loadCustomerDeposits(),
      loadVendorAdvances(),
    ]);
    setActiveSection('dashboard');
  } catch (error) {
    showNotification(`Gagal memuat data: ${error.message}`, 'error');
  }
}

async function initializeApp() {
  renderDateNow();
  bindEvents();
  await loadApplicationData();
}

initializeApp();
