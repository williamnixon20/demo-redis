# Basic Redis Caching Demo

Aplikasi ini mengembalikan jumlah repositori dari akun Github. Saat pertama kali mencari akun, server memanggil API Github untuk mengembalikan respons. Ini bisa memakan waktu ratusan milidetik. Kemudian, server menambahkan detail respons yang lambat ini ke Redis untuk permintaan di masa depan. Ketika Anda mencari lagi, respons selanjutnya datang langsung dari cache Redis daripada memanggil Github. Respons tersebut biasanya dikembalikan dalam hitungan milidetik, membuatnya sangat cepat.

Selain itu, fitur tambahan yang telah diimplementasikan adalah "rate limiting" untuk membatasi jumlah permintaan yang dapat dilakukan dalam satu periode waktu tertentu guna mencegah penggunaan berlebihan terhadap sumber daya server.

Sumber: Diadaptasi dari https://developer.redis.com/howtos/ratelimiting/

## Mekanisme Caching

### 1. Data disimpan dengan menggunakan command SETEX, dengan format {EXP_TIME} {VALUE}
```
SETEX microsoft {EXP_TIME} {VALUE}
```

### 2. Data dapat diakses dengan command GET:
```
GET microsoft
```

## Mekanisme Rate Limiting

### 1. User yang memakai API di cache dengan command SETNX
```
SETNX IP_USER {LIMIT USER}
```
### 2. Jika IP baru pertama kali di set, maka SET expiry time dari key.
```
EXPIRE IP_USER 60
```

### 3. Jika sudah berulang kali, dekremen value. Jika sudah dibawah 0, berikan respon TOO MANY REQUESTS.
```
DECRBY IP_USER 1
```


## How to run it locally?

#### Run frontend

```sh
cd client
yarn
yarn serve
```

#### Run backend

``` sh
yarn
yarn start
```
