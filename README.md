# 🛡️ Implementasi Keamanan Multi-Faktor (MFA) ArchelStore

Dokumen ini merinci mekanisme Keamanan Multi-Faktor (MFA) yang diterapkan dalam proyek ArchelStore sebagai bagian dari demonstrasi praktik Keamanan Siber. Sistem ini mengamankan pengguna dengan empat faktor otentikasi (4FA), menggabungkan teknik Hashing, Enkripsi Transport Layer (TLS), dan Keamanan Hardware.

---

## 🔑 1. Password (Faktor Pengetahuan)

Password adalah kredensial otentikasi utama yang diamankan menggunakan algoritma Hashing modern di sisi server **Firebase Authentication**.

### A. Algoritma dan Parameter (SCRYPT)

Firebase menggunakan fungsi turunan kunci yang memakan memori, **SCRYPT**, untuk mencegah serangan *brute force* skala besar (terutama yang menggunakan GPU).

| Parameter | Konsep | Nilai Implementasi |
| :--- | :--- | :--- |
| **Algoritma** | Hashing kuat, resisten terhadap GPU. | `SCRYPT` |
| **Biaya Memori (N)** | Mengatur kebutuhan RAM per perhitungan. | `mem_cost: 14` |
| **Rounds (p)** | Faktor Paralelisasi/Iterasi. | `rounds: 8` |
| **Kunci Rahasia** | Kunci unik server untuk verifikasi hash. | `base64_signer_key` (Dikelola Firebase) |

### B. Proses Keamanan (Hashing)

1.  **Enkripsi Transport:** Password mentah (`P`) dikirim dari aplikasi Flutter ke server melalui koneksi aman **TLS/HTTPS**.
2.  **Hashing:** Server menghitung Hash Scrypt menggunakan *salt* (`S`) unik per pengguna.
    > Rumus: `Hash_scrypt = SCRYPT(Password, Salt, N, r, p)`
3.  **Verifikasi:** Saat login, server menghitung ulang hash dari input pengguna dan membandingkannya dengan hash yang tersimpan di database.

---

## 🔐 2. PIN Keamanan (Faktor Pengetahuan)

PIN digunakan untuk verifikasi transaksi penting (seperti checkout). PIN di-*hash* secara manual di sisi aplikasi (Client-Side) sebelum dikirim dan disimpan di Realtime Database.

### A. Algoritma dan Strategi

| Fitur | Implementasi |
| :--- | :--- |
| **Algoritma** | **SHA-256** (Secure Hash Algorithm 256-bit) |
| **Strategi Salt** | **Statik + Dinamis:** Menggabungkan string statis `"PinSaltArchel"` dengan sebagian UID pengguna. |
| **Penyimpanan** | Disimpan sebagai *String Hash* di Firebase Realtime Database. |

### B. Proses Keamanan (SHA-256 Hashing)

1.  **Input:** Pengguna memasukkan PIN mentah (`PIN_input`).
2.  **Perhitungan:** Aplikasi menggabungkan PIN dengan *salt* unik (`S_uid`) lalu melakukan hashing.
    > Rumus: `Hash_pin = SHA256(PIN_input + S_uid)`
3.  **Verifikasi:** Saat transaksi, aplikasi menghitung ulang hash dari input saat ini dan membandingkannya dengan `Hash_pin` yang tersimpan di database. Jika cocok, transaksi diizinkan.

---

## 📧 3. OTP / Email Verification (Faktor Kepemilikan)

Digunakan untuk memverifikasi kepemilikan akun atau email, dikelola sepenuhnya oleh infrastruktur Firebase.

| Fitur | Implementasi di ArchelStore |
| :--- | :--- |
| **Generation** | Kode acak 6 digit dengan waktu hidup terbatas (TTL). |
| **Keamanan Saluran** | Pengiriman kode (via Email) dilindungi oleh enkripsi **TLS/HTTPS** antara server Firebase dan penyedia Email pengguna. |
| **Verifikasi** | Server membandingkan hash dari kode yang dimasukkan pengguna dengan hash kode yang tersimpan di *cache* sementara server. |

---

## 👆 4. Fingerprint / Biometrik (Faktor Inheren)

Digunakan untuk otentikasi cepat dan praktis, diaktifkan hanya setelah pengguna berhasil memverifikasi PIN/Password.

### A. Mekanisme Keamanan

| Fitur | Implementasi |
| :--- | :--- |
| **Algoritma** | **Enkripsi Hardware (Hardware-Backed Keystore)** |
| **Penyimpanan** | **Secure Enclave / TEE** (*Trusted Execution Environment*) pada perangkat. |
| **Akses Data** | Aplikasi **HANYA** menerima hasil Boolean (`True` atau `False`) dari Sistem Operasi. Data sidik jari tidak pernah keluar dari perangkat. |

### B. Proses Keamanan

1.  **Enkripsi Hardware:** Template Biometrik pengguna dienkripsi menggunakan kunci unik perangkat keras (`Hardware Key`) dan disimpan di area memori terisolasi (*Secure Enclave*).
2.  **Verifikasi:**
    * Aplikasi meminta OS untuk melakukan verifikasi.
    * Pengguna memindai jari.
    * *Chip* keamanan melakukan dekripsi dan perbandingan secara internal.
    * Hasil dikembalikan ke aplikasi tanpa mengekspos data biometrik mentah.
