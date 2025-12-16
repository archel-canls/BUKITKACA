# archelstore

A new Flutter project.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.

# 🛡️ Implementasi Keamanan Multi-Faktor (MFA) ArchelStore

Dokumen ini merinci arsitektur keamanan yang diterapkan pada ArchelStore. Sistem ini menggunakan pendekatan **4-Factor Authentication (4FA)** yang mencakup *Knowledge* (Pengetahuan), *Possession* (Kepemilikan), dan *Inherence* (Biometrik), didukung oleh enkripsi transport layer (TLS) dan keamanan berbasis perangkat keras.

---

## 🔑 1. Password (Faktor Pengetahuan)

Password adalah lapisan keamanan utama yang diamankan menggunakan algoritma *hashing* modern di sisi server **Firebase Authentication**.

### A. Algoritma dan Parameter
Firebase menggunakan algoritma **SCRYPT**, sebuah fungsi derivasi kunci yang memakan memori secara intensif untuk mencegah serangan *brute-force* (terutama yang menggunakan GPU).

| Fitur | Implementasi di ArchelStore |
| :--- | :--- |
| **Algoritma** | `SCRYPT` |
| **Biaya Memori (N)** | `mem_cost: 14` |
| **Iterasi (p)** | `rounds: 8` |
| **Salt & Key** | Dikelola otomatis oleh Firebase (`base64_signer_key` + Salt unik per user). |

### B. Proses Keamanan

#### 1. Enkripsi/Hashing (Saat Registrasi)
* **Transport:** Password mentah (`P`) dikirim dari aplikasi ke server melalui koneksi aman **TLS/HTTPS**.
* **Salting:** Server Firebase menghasilkan *salt* unik (`S`) untuk pengguna tersebut.
* **Perhitungan Matematis:**
  Server menghitung hash menggunakan rumus berikut:
  $$Hash_{scrypt} = SCRYPT(P, S, N, r, p)$$
  *Dimana `N` = 14, `r` = block size, dan `p` = 8.*
* **Penyimpanan:** Firebase menyimpan `Hash_scrypt` dan `S`. Password mentah **tidak pernah** disimpan.

#### 2. Dekripsi/Verifikasi (Saat Login)
* Pengguna memasukkan password input (`P_input`).
* Server mengambil `S` dan `Hash_scrypt` dari database.
* Server menghitung ulang hash:
  $$Hash_{input} = SCRYPT(P_{input}, S, N, r, p)$$
* **Verifikasi:** Jika `Hash_input == Hash_scrypt`, maka login berhasil.
* *Catatan:* Ini adalah metode perbandingan hash, bukan dekripsi password.

---

## 🔐 2. PIN Keamanan (Faktor Pengetahuan)

PIN digunakan untuk verifikasi transaksi (checkout/transfer). PIN di-*hash* secara manual di sisi aplikasi (Flutter) sebelum dikirim ke database.

### A. Algoritma Implementasi
| Fitur | Implementasi |
| :--- | :--- |
| **Algoritma** | **SHA-256** (Secure Hash Algorithm 256-bit) |
| **Strategi Salt** | **Statik + Dinamis**: Menggabungkan string `"PinSaltArchel"` dengan sebagian UID pengguna. |

### B. Proses Keamanan

#### 1. Enkripsi/Hashing (Saat Membuat/Mengganti PIN)
* PIN mentah (`P_pin`) diinput di aplikasi.
* Aplikasi menggabungkan PIN dengan salt unik dari UID (`S_uid`).
* **Perhitungan Matematis:**
  $$Hash_{pin} = SHA256(P_{pin} + S_{uid})$$
* **Penyimpanan:** `Hash_pin` dikirim ke Realtime Database melalui koneksi **TLS/HTTPS**.

#### 2. Dekripsi/Verifikasi (Saat Transaksi)
* Pengguna memasukkan PIN input (`P_input`).
* Aplikasi mengambil `S_uid` yang sama dan `Hash_pin` yang tersimpan di database.
* Aplikasi menghitung ulang hash:
  $$Hash_{input} = SHA256(P_{input} + S_{uid})$$
* **Verifikasi:** Jika `Hash_input == Hash_pin`, transaksi disetujui.

---

## 📧 3. OTP (One-Time Password) (Faktor Kepemilikan)

Digunakan untuk verifikasi kepemilikan akun atau email, dikelola sepenuhnya oleh infrastruktur Firebase.

### A. Algoritma dan Proses
| Fitur | Implementasi |
| :--- | :--- |
| **Algoritma** | **PRNG** (Pseudo-Random Number Generator) yang kuat secara kriptografi. |
| **Keamanan Transport** | Pengiriman kode via Email dilindungi enkripsi **TLS/HTTPS** *end-to-end*. |
| **Hashing Server** | Kode OTP yang aktif disimpan dalam bentuk *hash* di server sementara dengan waktu kedaluwarsa (TTL). |

### B. Proses Keamanan

#### 1. Saat Pengiriman
Kode OTP dikirim melalui saluran email yang terenkripsi (Transport Layer Security).

#### 2. Saat Input (Verifikasi)
* Pengguna memasukkan kode (`T`).
* Server Firebase menghitung `Hash(T)` dan membandingkannya dengan hash yang tersimpan di *cache*.
* Sistem juga memvalidasi apakah waktu saat ini masih dalam rentang waktu berlakunya kode.

---

## 👆 4. Fingerprint / Biometrik (Faktor Inheren)

Digunakan untuk otentikasi instan, memanfaatkan perangkat keras keamanan pada *device*.

### A. Algoritma dan Komponen
| Fitur | Implementasi |
| :--- | :--- |
| **Algoritma** | **Hardware Encryption** (Enkripsi Perangkat Keras). |
| **Penyimpanan** | **Secure Enclave / TEE** (Trusted Execution Environment). Data terisolasi dari OS. |
| **Data Tersimpan** | Template Biometrik yang dienkripsi kunci unik perangkat keras. |

### B. Proses Keamanan

#### 1. Enkripsi & Penyimpanan
Data biometrik mentah pengguna diubah menjadi template, kemudian dienkripsi menggunakan Kunci Perangkat Keras Unik (`K_hw`) dan disimpan di dalam Secure Enclave.
$$Penyimpanan = Enkripsi(Template_{Biometrik}, K_{hw})$$

---

## 📝 Studi Kasus: Simulasi Alur Keamanan Data

Berikut adalah simulasi langkah demi langkah bagaimana data pengguna diolah dan diamankan dalam arsitektur ArchelStore menggunakan nilai konkret dan perhitungan *hashing* yang disederhanakan.

### 📌 Asumsi Nilai Input
* **Password Mentah (`P`):** `password123`
* **PIN Mentah (`P_pin`):** `123456`
* **User ID (`UID`):** `uid123456789`
* **Email:** `user@example.com`

---

### 1. 🔑 Pengamanan PASSWORD (SCRYPT Hashing)
Password diamankan oleh **Firebase Authentication** menggunakan algoritma **SCRYPT** (sangat kuat terhadap *brute-force*).

#### A. Hashing (Penyimpanan)
| Langkah | Aksi / Data | Konsep Keamanan |
| :--- | :--- | :--- |
| **Input** | `P = "password123"` | Dikirim via **TLS/HTTPS** (Enkripsi Jalur). |
| **Salt** | Firebase membuat salt unik (misal `S = "ABcxyz123"`) dan menggunakan *Signer Key* rahasia. | Pertahanan terhadap serangan *Rainbow Table*. |
| **Perhitungan** | Server menghitung Hash Scrypt dengan parameter: <br> `N=14` (mem_cost), `p=8` (rounds). | Memakan Memori & Waktu (Anti Brute-force). |
| **Hasil** | `Hash_scrypt` ≈ `"4B7F98...E01A"` | **Password mentah tidak dapat dikembalikan.** Hash ini yang disimpan di database. |

#### B. Verifikasi (Saat Login)
1. Anda memasukkan input: `"password123"`.
2. Server mengambil Salt (`S`) yang tersimpan.
3. Server menghitung ulang: `Hash_input = SCRYPT("password123", S, 14, 8)`.
4. **Hasil:** Jika `Hash_input == Hash_scrypt`, maka **Login Berhasil**.

---

### 2. 🔐 Pengamanan PIN Keamanan (SHA-256 Hashing Manual)
PIN diamankan secara manual di sisi aplikasi (Flutter) sebelum dikirim dan disimpan di Realtime Database.

#### A. Hashing (Penyimpanan)
| Langkah | Aksi / Data | Konsep Keamanan |
| :--- | :--- | :--- |
| **Input** | `P_pin = "123456"` | Input dari user. |
| **Salt UID** | `S_uid = "PinSaltArchel" + "uid12"` | Salt statis digabung dengan 5 karakter awal UID (`uid123456789`). |
| **Gabungan** | `Raw_pin = "123456PinSaltArcheluid12"` | String gabungan sebelum di-hash. |
| **Perhitungan** | `Hash_pin = SHA256(Raw_pin)` | Hashing satu arah yang cepat dan standar. |
| **Hasil** | `Hash_pin` ≈ `"9D42C1...183F"` | Dikirim ke Realtime DB via **TLS/HTTPS**. |

#### B. Verifikasi (Saat Checkout/Transfer)
1. Anda memasukkan input: `"123456"`.
2. Aplikasi membentuk string gabungan: `"123456PinSaltArcheluid12"`.
3. Aplikasi menghitung hash: `Hash_input = SHA256("123456PinSaltArcheluid12")`.
4. **Hasil:** Jika `Hash_input == Hash_pin` (yang ada di DB), maka **Transaksi Berhasil**.

---

### 3. 📧 Pengamanan OTP (Email Verification)
Digunakan untuk memverifikasi bahwa Anda adalah pemilik `user@example.com`.

| Langkah | Aksi | Konsep Keamanan |
| :--- | :--- | :--- |
| **Generate** | Firebase membuat kode acak, misal `T = 583192` dengan waktu kadaluwarsa 5 menit. | *Randomness* yang kuat. |
| **Pengiriman** | Kode `583192` dikirim ke email. | Dilindungi oleh **Enkripsi TLS/HTTPS** pada saluran transfer Email. |
| **Penyimpanan** | Server menyimpan `Hash(583192)` di *cache*. | Server tidak menyimpan kode plain text dalam jangka panjang. |
| **Verifikasi** | Anda menginput `583192`. Server menghitung hash input dan mencocokkannya dengan hash di *cache*. | Valid hanya jika hash cocok DAN waktu belum habis. |

---

### 4. 👆 Pengamanan Fingerprint (Biometrik)
Digunakan untuk verifikasi cepat tanpa mengetik PIN/Password.

| Langkah | Aksi | Konsep Keamanan |
| :--- | :--- | :--- |
| **Penyimpanan** | Template Biometrik (`F`) dienkripsi menjadi `E_template` menggunakan **Kunci Hardware Unik** (`K_hw`). | Dilindungi oleh **Enkripsi Hardware** di dalam *Secure Enclave*. |
| **Verifikasi** | Aplikasi meminta izin verifikasi. Anda menyentuh sensor sidik jari. | OS menangani antarmuka (UI). |
| **Pengecekan** | *Secure Enclave* mendekripsi `E_template` menggunakan `K_hw` dan membandingkannya dengan scan jari baru. | Proses **Dekripsi** terjadi hanya di dalam chip terisolasi. |
| **Hasil** | Aplikasi menerima sinyal `True` (jika cocok). | **Tidak ada data biometrik yang pernah keluar dari perangkat.** |

---

## ✅ Kesimpulan Keamanan Siber

Secara umum, ArchelStore menggunakan kombinasi mekanisme keamanan terbaik sesuai standar industri:

1. **Hashing Kuat (SCRYPT):** Untuk Password (melawan serangan *brute force*).
2. **Hashing Standar (SHA-256):** Untuk PIN (melawan pembacaan database langsung).
3. **Enkripsi Transport Layer (TLS):** Untuk melindungi semua jalur komunikasi data (Internet).
4. **Enkripsi Hardware:** Untuk Biometrik (melawan *spyware* dan pencurian data fisik).
