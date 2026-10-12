-- TripFund database schema for Supabase PostgreSQL
-- Versi awal: 4 tabel utama dengan relasi 1-to-many
-- Catatan: SQL ini dirancang untuk dijalankan di Supabase SQL Editor setelah proyek dibuat.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1) customers
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code TEXT NOT NULL UNIQUE CHECK (length(trim(customer_code)) > 0),
    full_name TEXT NOT NULL CHECK (length(trim(full_name)) > 0),
    phone TEXT NOT NULL CHECK (length(trim(phone)) > 0),
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE customers IS 'Master data pelanggan yang melakukan deposit untuk perjalanan.';
COMMENT ON COLUMN customers.customer_code IS 'Kode pelanggan unik yang dipakai untuk identifikasi cepat.';
COMMENT ON COLUMN customers.full_name IS 'Nama lengkap pelanggan.';
COMMENT ON COLUMN customers.phone IS 'Nomor telepon utama pelanggan.';
COMMENT ON COLUMN customers.email IS 'Alamat email pelanggan, bersifat opsional.';

-- ============================================================
-- 2) vendors
-- ============================================================
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_code TEXT NOT NULL UNIQUE CHECK (length(trim(vendor_code)) > 0),
    vendor_name TEXT NOT NULL CHECK (length(trim(vendor_name)) > 0),
    service_type TEXT NOT NULL CHECK (length(trim(service_type)) > 0),
    phone TEXT NOT NULL CHECK (length(trim(phone)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Upgrade an earlier vendors table in place. CREATE TABLE IF NOT EXISTS does
-- not add columns to a table that already exists.
ALTER TABLE vendors
    ADD COLUMN IF NOT EXISTS vendor_code TEXT;
ALTER TABLE vendors
    ADD COLUMN IF NOT EXISTS vendor_name TEXT;
ALTER TABLE vendors
    ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE vendors
    ADD COLUMN IF NOT EXISTS phone TEXT;

-- Copy common legacy column names when present, before applying safe defaults.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'vendors' AND column_name IN ('name', 'name_vendor')
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'vendors' AND column_name = 'name'
        ) THEN
            EXECUTE 'UPDATE vendors SET vendor_name = COALESCE(NULLIF(trim(vendor_name), ''''), NULLIF(trim(name::text), ''''))';
        ELSE
            EXECUTE 'UPDATE vendors SET vendor_name = COALESCE(NULLIF(trim(vendor_name), ''''), NULLIF(trim(name_vendor::text), ''''))';
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'vendors' AND column_name IN ('category', 'service', 'type')
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'vendors' AND column_name = 'category'
        ) THEN
            EXECUTE 'UPDATE vendors SET service_type = COALESCE(NULLIF(trim(service_type), ''''), NULLIF(trim(category::text), ''''))';
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'vendors' AND column_name = 'service'
        ) THEN
            EXECUTE 'UPDATE vendors SET service_type = COALESCE(NULLIF(trim(service_type), ''''), NULLIF(trim(service::text), ''''))';
        ELSE
            EXECUTE 'UPDATE vendors SET service_type = COALESCE(NULLIF(trim(service_type), ''''), NULLIF(trim(type::text), ''''))';
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'vendors' AND column_name IN ('phone_number', 'contact')
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'vendors' AND column_name = 'phone_number'
        ) THEN
            EXECUTE 'UPDATE vendors SET phone = COALESCE(NULLIF(trim(phone), ''''), NULLIF(trim(phone_number::text), ''''))';
        ELSE
            EXECUTE 'UPDATE vendors SET phone = COALESCE(NULLIF(trim(phone), ''''), NULLIF(trim(contact::text), ''''))';
        END IF;
    END IF;
END $$;

UPDATE vendors
SET vendor_code = 'VND-' || upper(substr(md5(id::text), 1, 8))
WHERE vendor_code IS NULL OR length(trim(vendor_code)) = 0;

UPDATE vendors
SET vendor_name = 'Vendor lama ' || upper(substr(md5(id::text), 1, 8))
WHERE vendor_name IS NULL OR length(trim(vendor_name)) = 0;

UPDATE vendors
SET service_type = 'lainnya'
WHERE service_type IS NULL OR length(trim(service_type)) = 0;

UPDATE vendors
SET phone = '-'
WHERE phone IS NULL OR length(trim(phone)) = 0;

ALTER TABLE vendors
    ALTER COLUMN vendor_code SET NOT NULL;
ALTER TABLE vendors
    ALTER COLUMN vendor_name SET NOT NULL;
ALTER TABLE vendors
    ALTER COLUMN service_type SET NOT NULL;
ALTER TABLE vendors
    ALTER COLUMN phone SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS vendors_vendor_code_unique_idx
    ON vendors(vendor_code);

COMMENT ON TABLE vendors IS 'Master data vendor penyedia layanan perjalanan.';
COMMENT ON COLUMN vendors.vendor_code IS 'Kode vendor unik.';
COMMENT ON COLUMN vendors.vendor_name IS 'Nama vendor.';
COMMENT ON COLUMN vendors.service_type IS 'Jenis layanan vendor seperti hotel, transportasi, tiket, atau aktivitas wisata.';
COMMENT ON COLUMN vendors.phone IS 'Nomor telepon vendor.';

-- ============================================================
-- 3) customer_deposits
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deposit_code TEXT NOT NULL UNIQUE CHECK (length(trim(deposit_code)) > 0),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    trip_name TEXT NOT NULL CHECK (length(trim(trip_name)) > 0),
    deposit_amount NUMERIC(15,2) NOT NULL CHECK (deposit_amount > 0),
    payment_date DATE NOT NULL,
    payment_method TEXT NOT NULL CHECK (
        payment_method IN ('transfer_bank', 'tunai', 'kartu', 'ewallet', 'lainnya')
    ),
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE customer_deposits IS 'Riwayat penerimaan deposit pelanggan.';
COMMENT ON COLUMN customer_deposits.deposit_code IS 'Kode unik transaksi deposit.';
COMMENT ON COLUMN customer_deposits.customer_id IS 'Relasi ke tabel customers.';
COMMENT ON COLUMN customer_deposits.deposit_amount IS 'Nominal deposit wajib lebih besar dari 0.';
COMMENT ON COLUMN customer_deposits.status IS 'Status transaksi: pending, paid, atau cancelled.';

-- ============================================================
-- 4) vendor_advance_payments
-- ============================================================
CREATE TABLE IF NOT EXISTS vendor_advance_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_code TEXT NOT NULL UNIQUE CHECK (length(trim(payment_code)) > 0),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
    trip_name TEXT NOT NULL CHECK (length(trim(trip_name)) > 0),
    advance_amount NUMERIC(15,2) NOT NULL CHECK (advance_amount > 0),
    payment_date DATE NOT NULL,
    payment_method TEXT NOT NULL CHECK (
        payment_method IN ('transfer_bank', 'tunai', 'kartu', 'ewallet', 'lainnya')
    ),
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE vendor_advance_payments IS 'Riwayat pembayaran uang muka kepada vendor.';
COMMENT ON COLUMN vendor_advance_payments.payment_code IS 'Kode unik transaksi uang muka vendor.';
COMMENT ON COLUMN vendor_advance_payments.vendor_id IS 'Relasi ke tabel vendors.';
COMMENT ON COLUMN vendor_advance_payments.advance_amount IS 'Nominal uang muka wajib lebih besar dari 0.';
COMMENT ON COLUMN vendor_advance_payments.status IS 'Status transaksi: pending, paid, atau cancelled.';

-- ============================================================
-- Indexing
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_customer_deposits_customer_id
    ON customer_deposits(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_deposits_status
    ON customer_deposits(status);

CREATE INDEX IF NOT EXISTS idx_customer_deposits_payment_date
    ON customer_deposits(payment_date);

CREATE INDEX IF NOT EXISTS idx_vendor_advance_payments_vendor_id
    ON vendor_advance_payments(vendor_id);

CREATE INDEX IF NOT EXISTS idx_vendor_advance_payments_status
    ON vendor_advance_payments(status);

CREATE INDEX IF NOT EXISTS idx_vendor_advance_payments_payment_date
    ON vendor_advance_payments(payment_date);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_advance_payments ENABLE ROW LEVEL SECURITY;

-- Mode tanpa login sesuai permintaan: role anon dapat membaca dan mengubah seluruh
-- baris pada keempat tabel. Ini membuat data keuangan publik bagi siapa pun yang
-- dapat mengakses endpoint/key proyek. Gunakan hanya untuk demo atau data non-sensitif.
-- Untuk data nyata, hapus kebijakan anon dan gunakan Supabase Auth serta kebijakan
-- akses terbatas. Kebijakan authenticated tetap tersedia untuk pengguna yang login.

DROP POLICY IF EXISTS "Anonymous users can manage customers" ON customers;
CREATE POLICY "Anonymous users can manage customers"
    ON customers FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anonymous users can manage vendors" ON vendors;
CREATE POLICY "Anonymous users can manage vendors"
    ON vendors FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anonymous users can manage deposits" ON customer_deposits;
CREATE POLICY "Anonymous users can manage deposits"
    ON customer_deposits FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anonymous users can manage vendor payments" ON vendor_advance_payments;
CREATE POLICY "Anonymous users can manage vendor payments"
    ON vendor_advance_payments FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can view customers" ON customers;
CREATE POLICY "Authenticated users can view customers"
    ON customers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert customers" ON customers;
CREATE POLICY "Authenticated users can insert customers"
    ON customers FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update customers" ON customers;
CREATE POLICY "Authenticated users can update customers"
    ON customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete customers" ON customers;
CREATE POLICY "Authenticated users can delete customers"
    ON customers FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view vendors" ON vendors;
CREATE POLICY "Authenticated users can view vendors"
    ON vendors FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert vendors" ON vendors;
CREATE POLICY "Authenticated users can insert vendors"
    ON vendors FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update vendors" ON vendors;
CREATE POLICY "Authenticated users can update vendors"
    ON vendors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete vendors" ON vendors;
CREATE POLICY "Authenticated users can delete vendors"
    ON vendors FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view deposits" ON customer_deposits;
CREATE POLICY "Authenticated users can view deposits"
    ON customer_deposits FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert deposits" ON customer_deposits;
CREATE POLICY "Authenticated users can insert deposits"
    ON customer_deposits FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update deposits" ON customer_deposits;
CREATE POLICY "Authenticated users can update deposits"
    ON customer_deposits FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete deposits" ON customer_deposits;
CREATE POLICY "Authenticated users can delete deposits"
    ON customer_deposits FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view vendor payments" ON vendor_advance_payments;
CREATE POLICY "Authenticated users can view vendor payments"
    ON vendor_advance_payments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert vendor payments" ON vendor_advance_payments;
CREATE POLICY "Authenticated users can insert vendor payments"
    ON vendor_advance_payments FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update vendor payments" ON vendor_advance_payments;
CREATE POLICY "Authenticated users can update vendor payments"
    ON vendor_advance_payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete vendor payments" ON vendor_advance_payments;
CREATE POLICY "Authenticated users can delete vendor payments"
    ON vendor_advance_payments FOR DELETE TO authenticated USING (true);

-- RLS policies do not grant SQL privileges by themselves. Grant the required
-- table privileges explicitly so PostgREST operations can reach the policies.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
    ON TABLE customers, vendors, customer_deposits, vendor_advance_payments
    TO anon, authenticated;

-- ============================================================
-- Optional seed data (dikomentari agar tidak berjalan otomatis)
-- ============================================================
-- INSERT INTO customers (customer_code, full_name, phone, email)
-- VALUES
--   ('CUST-001', 'Anita Wijaya', '081234567890', 'anita@example.com'),
--   ('CUST-002', 'Budi Santoso', '082345678901', 'budi@example.com');
--
-- INSERT INTO vendors (vendor_code, vendor_name, service_type, phone)
-- VALUES
--   ('VND-001', 'Hotel Grand Asia', 'hotel', '081112223334'),
--   ('VND-002', 'Trans Travel Indonesia', 'transportasi', '082223334445');
--
-- INSERT INTO customer_deposits (deposit_code, customer_id, trip_name, deposit_amount, payment_date, payment_method, status, notes)
-- VALUES
--   (
--     'DP-001',
--     (SELECT id FROM customers WHERE customer_code = 'CUST-001'),
--     'Liburan Bali 2026',
--     12000000,
--     '2026-01-12',
--     'transfer_bank',
--     'paid',
--     'Deposit awal paket wisata.'
--   );
--
-- INSERT INTO vendor_advance_payments (payment_code, vendor_id, trip_name, advance_amount, payment_date, payment_method, status, notes)
-- VALUES
--   (
--     'ADV-001',
--     (SELECT id FROM vendors WHERE vendor_code = 'VND-001'),
--     'Liburan Bali 2026',
--     8500000,
--     '2026-01-14',
--     'transfer_bank',
--     'paid',
--     'Uang muka reservasi kamar hotel.'
--   );

-- ============================================================
-- ERD summary:
-- customers.id -> customer_deposits.customer_id (1:N)
-- vendors.id -> vendor_advance_payments.vendor_id (1:N)
--
-- Prinsip bisnis:
-- 1. Setiap transaksi harus terhubung ke master data valid.
-- 2. Kode transaksi unik untuk mencegah duplikasi.
-- 3. Nominal transaksi harus > 0.
-- 4. Status hanya menerima pending, paid, atau cancelled.
-- 5. Customer atau vendor yang masih memiliki transaksi tidak dapat dihapus.
-- 6. Mode aplikasi tanpa login menggunakan kebijakan anon terbuka; data dapat diakses publik.
