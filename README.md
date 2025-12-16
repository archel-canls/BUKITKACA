# 🛡️ Implementasi Keamanan Multi-Faktor (MFA) ArchelStore

Dokumen ini merinci mekanisme Keamanan Multi-Faktor (MFA) yang diterapkan dalam proyek ArchelStore, sebagai bagian dari demonstrasi praktik Keamanan Siber. ArchelStore mengamankan pengguna dengan empat faktor otentikasi (4FA), yang menggabungkan Hashing, Enkripsi Transport Layer (TLS), dan Keamanan Hardware.

## 🔑 1. Password (Faktor Pengetahuan)

Password adalah kredensial otentikasi utama dan diamankan menggunakan Hashing yang sangat kuat di sisi server **Firebase Authentication**.

### A. Algoritma dan Parameter Hashing (SCRYPT)

Firebase menggunakan fungsi turunan kunci yang memakan memori, **SCRYPT**, untuk mencegah serangan *brute force* skala besar.

| Parameter | Konsep | Nilai Implementasi |
| :--- | :--- | :--- |
| **Algoritma** | Hashing yang kuat, tahan GPU. | `SCRYPT` |
| **Biaya Memori (N)** | Mengatur kebutuhan RAM per perhitungan. | `mem_cost: 14` |
| **Rounds (p)** | Faktor Paralelisasi/Iterasi. | `rounds: 8` |
| **Kunci Rahasia** | Kunci unik server untuk verifikasi *hash*. | `base64_signer_key` (Dikelola Firebase) |

### B. Proses Keamanan (Hashing)

1.  **Enkripsi Transport:** Password ($P$) dikirim dari aplikasi Flutter ke server melalui koneksi **TLS/HTTPS** (Enkripsi Transport Layer).
2.  **Hashing:** Server menghitung Hash Scrypt, menggunakan *salt* ($S$) unik per pengguna:
    $$\text{Hash}_{\text{scrypt}} = \text{SCRYPT}(P, S, N, r, p)$$
3.  **Verifikasi:** Saat login, server menghitung ulang $\text{Hash}_{\text{input}}$ dan membandingkannya dengan $\text{Hash}_{\text{scrypt}}$ yang tersimpan.

---

## 2. 🔐 PIN Keamanan (Faktor Pengetahuan)

PIN digunakan untuk verifikasi transaksi penting (e.g., checkout). PIN di-*hash* di sisi aplikasi Flutter sebelum disimpan di Realtime Database.

### A. Algoritma dan Strategi

| Fitur | Implementasi |
| :--- | :--- |
| **Algoritma** | **SHA-256** (minimal) |
| **Salt Strategy** | **Statik + Dinamis:** Menggunakan *salt* statis (`"PinSaltArchel"`) digabungkan dengan bagian dari UID pengguna ($S_{\text{uid}}$). |
| **Penyimpanan**| Disimpan sebagai Hash di Firebase Realtime Database. |

### B. Proses Keamanan (SHA-256 Hashing)

1.  **Input:** PIN mentah ($P_{\text{pin}}$) diinput.
2.  **Perhitungan:** Aplikasi menggabungkan PIN dengan *salt* unik ($S_{\text{uid}}$) dan menghitung Hash SHA-256:
    $$\text{Hash}_{\text{pin}} = \text{SHA256}(P_{\text{pin}} \parallel S_{\text{uid}})$$
3.  **Verifikasi:** Saat transaksi, aplikasi menghitung ulang $\text{Hash}_{\text{input}}$ dan membandingkannya dengan $\text{Hash}_{\text{pin}}$ yang tersimpan di DB.

---

## 3. 📧 OTP / Email Verification (Faktor Kepemilikan)

Digunakan untuk verifikasi akun (dikelola oleh Firebase).

| Fitur | Implementasi di ArchelStore |
| :--- | :--- |
| **Generation** | Kode 6 digit acak yang berlaku dalam waktu singkat (TTL). |
| **Keamanan Saluran**| Pengiriman kode (via Email) dilindungi oleh **TLS/HTTPS** antara server Firebase dan server Email pengguna. |
| **Verifikasi**| Server membandingkan *hash* dari kode input dengan *hash* kode yang tersimpan di *cache* sementara, sambil memeriksa waktu kedaluwarsa. |

---

## 4. 👆 Fingerprint / Biometrik (Faktor Inheren)

Digunakan untuk otentikasi cepat, diaktifkan setelah verifikasi PIN/Password.

### A. Mekanisme Keamanan

| Fitur | Implementasi |
| :--- | :--- |
| **Algoritma** | **Enkripsi Hardware** |
| **Penyimpanan** | **Secure Enclave** (*chip* keamanan) perangkat. |
| **Akses** | Aplikasi hanya mendapat hasil **Boolean (True/False)** dari OS. |

### B. Proses Keamanan

1.  **Enkripsi Hardware:** Template Biometrik ($F$) dienkripsi menggunakan **Kunci Hardware Unik** ($K_{\text{hw}}$) dan disimpan di *Secure Enclave* ($E_{\text{template}}$).
2.  **Verifikasi:** Pengecekan sidik jari dilakukan secara internal oleh *chip* perangkat. Proses **dekripsi** dan perbandingan terjadi di dalam *Secure Enclave* yang terisolasi, memastikan data biometrik tidak pernah terekspos ke OS atau aplikasi ArchelStore.
