const CACHE_NAME = 'finance-tracker';

// Устанавливаем service worker
self.addEventListener('install', event => {
    self.skipWaiting(); // Сразу активируем новую версию
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('✅ Кэширование...');
            return cache.addAll([
                './',
                './index.html',
                './style.css',
                './script.js',
                './manifest.json',
                './icon-192.png',
                './icon-512.png'
            ]);
        })
    );
});

// Активация - удаляем старый кэш если есть
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        }).then(() => {
            console.log('✅ Service Worker готов');
            return self.clients.claim();
        })
    );
});

// Всегда сначала проверяем сеть, потом кэш
self.addEventListener('fetch', event => {
    // Пропускаем запросы к API и внешние ресурсы
    if (event.request.url.includes('telegram') ||
        event.request.url.includes('google') ||
        event.request.url.includes('chart.js')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Для всех остальных - сначала сеть, если не работает - кэш
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Если получили ответ от сети, обновляем кэш
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                // Если нет сети, берем из кэша
                return caches.match(event.request);
            })
    );
});