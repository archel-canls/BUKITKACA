// Fungsi untuk menghitung waktu yang lalu
        function timeAgo(date) {
            const now = new Date();
            const diff = now - new Date(date); // Selisih dalam milidetik

            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            const weeks = Math.floor(days / 7);
            const months = Math.floor(days / 30);
            const years = Math.floor(days / 365);

            if (seconds < 60) {
                return `${seconds} detik yang lalu`;
            } else if (minutes < 60) {
                return `${minutes} menit yang lalu`;
            } else if (hours < 24) {
                return `${hours} jam yang lalu`;
            } else if (days < 7) {
                return `${days} hari yang lalu`;
            } else if (weeks < 4) {
                return `${weeks} minggu yang lalu`;
            } else if (months < 12) {
                return `${months} bulan yang lalu`;
            } else {
                return `${years} tahun yang lalu`;
            }
        }

        function toggleMenu() {
            const navMenu = document.getElementById('navMenu');
            navMenu.classList.toggle('show');
        }

        function adjustBookSizes() {
            const bookListDiv = document.getElementById('bookList');
            const books = bookListDiv.querySelectorAll('.book-item');
            
            // Ambil ukuran container bookList
            const containerWidth = bookListDiv.offsetWidth;
            
            // Hitung ruang kosong di kanan (jika ada)
            const spacePerRow = containerWidth % (250 + 20); // 250 adalah lebar buku, 20 adalah gap
            const additionalWidth = spacePerRow / books.length;
        
            books.forEach(book => {
                book.style.flexBasis = `${250 + additionalWidth}px`; // Sesuaikan lebar buku
            });
        }
        
        function loadHeaderProfilePic() {
            const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
            const userProfiles = JSON.parse(localStorage.getItem('userProfiles')) || {};
            const profilePic = userProfiles[loggedInUser.username] || "default-profile.png";
            document.getElementById('headerProfilePic').style.backgroundImage = `url('${profilePic}')`;
        }

        loadHeaderProfilePic();
