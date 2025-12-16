# 🛡️ Implementasi Keamanan Multi-Faktor (MFA) ArchelStore

Dokumen ini merinci arsitektur keamanan yang diterapkan pada ArchelStore sebagai bagian dari demonstrasi praktik Keamanan Siber. Sistem ini menggunakan pendekatan **4-Factor Authentication (4FA)** yang mencakup *Knowledge* (Pengetahuan), *Possession* (Kepemilikan), dan *Inherence* (Biometrik), didukung oleh enkripsi transport layer (TLS) dan keamanan berbasis perangkat keras.

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
    ```
    Hash_scrypt = SCRYPT(P, S, N, r, p)
    ```
    *Dimana `N` = 14, `r` = block size, dan `p` = 8.*
* **Penyimpanan:** Firebase menyimpan `Hash_scrypt` dan `S`. Password mentah **tidak pernah** disimpan.

#### 2. Dekripsi/Verifikasi (Saat Login)
* Pengguna memasukkan password input (`P_input`).
* Server mengambil `S` dan `Hash_scrypt` dari database.
* Server menghitung ulang hash:
    ```
    Hash_input = SCRYPT(P_input, S, N, r, p)
    ```
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
    ```
    Hash_pin = SHA256(P_pin + S_uid)
    ```
* **Penyimpanan:** `Hash_pin` dikirim ke Realtime Database melalui koneksi **TLS/HTTPS**.

#### 2. Dekripsi/Verifikasi (Saat Transaksi)
* Pengguna memasukkan PIN input (`P_input`).
* Aplikasi mengambil `S_uid` yang sama dan `Hash_pin` yang tersimpan di database.
* Aplikasi menghitung ulang hash:
    ```
    Hash_input = SHA256(P_input + S_uid)
    ```
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
