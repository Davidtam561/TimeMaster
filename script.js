// זיהוי דפדפן ומערכת הפעלה
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isChrome = /CriOS/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

// הצגת הודעה למשתמשי כרום באייפון
if (isChrome && isIOS) {
    document.getElementById('browserAlert').style.display = 'block';
}

class NotificationHandler {
    static async requestPermission() {
        try {
            if (!('Notification' in window)) {
                console.warn('הדפדפן לא תומך בהתראות');
                return false;
            }

            if (Notification.permission === 'granted') {
                return true;
            }

            const result = await Notification.requestPermission();
            if (result === 'granted') {
                this.showTestNotification();
                return true;
            }

            return false;
        } catch (error) {
            console.error('שגיאה בבקשת הרשאות התראה:', error);
            return false;
        }
    }

    static showTestNotification() {
        try {
            const options = {
                body: 'התראות הופעלו בהצלחה!',
                icon: 'logo1.png',
                tag: 'test-notification',
                renotify: true,
                requireInteraction: false
            };

            if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification('TimeMaster', options);
                });
            } else {
                new Notification('TimeMaster', options);
            }
        } catch (error) {
            console.error('שגיאה בהתראת בדיקה:', error);
        }
    }

    static async showNotification(title, message) {
        try {
            if (Notification.permission !== 'granted') {
                const granted = await this.requestPermission();
                if (!granted) return;
            }

            const options = {
                body: message,
                icon: 'logo1.png',
                badge: 'logo3.png',
                tag: 'timer-notification',
                renotify: true,
                requireInteraction: true,
                vibrate: [200, 100, 200]
            };

            if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(title, options);
            } else {
                const notification = new Notification(title, options);
                setTimeout(() => notification.close(), 5000);
            }

            if ('vibrate' in navigator) {
                navigator.vibrate([200, 100, 200]);
            }
        } catch (error) {
            console.error('שגיאה בשליחת התראה:', error);
            this.showLocalNotification(title, message);
        }
    }

    static showLocalNotification(title, message) {
        const notification = document.createElement('div');
        notification.className = 'local-notification';
        notification.innerHTML = `
            <div>
                <strong>${title}</strong><br>
                ${message}
            </div>
            <button onclick="this.parentElement.remove()" 
                    style="background:var(--primary-color);color:white;
                           border:none;padding:5px 10px;border-radius:4px;
                           cursor:pointer">
                סגור
            </button>
        `;
        document.body.appendChild(notification);

        if ('vibrate' in navigator) {
            try {
                navigator.vibrate([200, 100, 200]);
            } catch (e) {
                console.warn('רטט לא נתמך:', e);
            }
        }

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

class PomodoroTimer {
    constructor() {
        this.workTime = 25 * 60;
        this.breakTime = 5 * 60;
        this.currentTime = this.workTime;
        this.isRunning = false;
        this.isWorkTime = true;
        this.timer = null;
        
        this.initializeElements();
        this.initializeEventListeners();
        this.initializeNotifications();
        this.loadState();
    }

    async initializeNotifications() {
        const granted = await NotificationHandler.requestPermission();
        document.getElementById('notificationsEnabled').checked = granted;
        
        if (granted) {
            NotificationHandler.showLocalNotification(
                'התראות',
                'התראות הופעלו בהצלחה!'
            );
        }
    }

    initializeElements() {
        this.timerDisplay = document.getElementById('timer');
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.statusText = document.getElementById('status');
        this.workTimeInput = document.getElementById('workTime');
        this.breakTimeInput = document.getElementById('breakTime');
    }

    initializeEventListeners() {
        this.startBtn.addEventListener('click', () => this.toggleTimer());
        this.resetBtn.addEventListener('click', () => this.resetTimer());
        
        this.workTimeInput.addEventListener('change', () => {
            this.workTime = this.workTimeInput.value * 60;
            if (this.isWorkTime) this.currentTime = this.workTime;
            this.updateDisplay();
        });
        
        this.breakTimeInput.addEventListener('change', () => {
            this.breakTime = this.breakTimeInput.value * 60;
            if (!this.isWorkTime) this.currentTime = this.breakTime;
            this.updateDisplay();
        });

        document.getElementById('notificationsEnabled').addEventListener('change', async (e) => {
            if (e.target.checked) {
                const granted = await NotificationHandler.requestPermission();
                e.target.checked = granted;
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.updateDisplay();
            }
        });
    }

    toggleTimer() {
        if (this.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }

    startTimer() {
        this.isRunning = true;
        this.startBtn.textContent = 'השהה';
        
        this.timer = setInterval(() => {
            this.currentTime--;
            if (this.currentTime <= 0) {
                this.handleTimerComplete();
            }
            this.updateDisplay();
            this.saveState();
        }, 1000);
    }

    pauseTimer() {
        this.isRunning = false;
        this.startBtn.textContent = 'המשך';
        clearInterval(this.timer);
        this.saveState();
    }

    resetTimer() {
        clearInterval(this.timer);
        this.isRunning = false;
        this.isWorkTime = true;
        this.currentTime = this.workTime;
        this.startBtn.textContent = 'התחל';
        this.statusText.textContent = 'זמן עבודה';
        this.updateDisplay();
        this.saveState();
    }

    handleTimerComplete() {
        this.isWorkTime = !this.isWorkTime;
        this.currentTime = this.isWorkTime ? this.workTime : this.breakTime;
        this.statusText.textContent = this.isWorkTime ? 'זמן עבודה' : 'זמן הפסקה';
        
        const message = this.isWorkTime ? 'זמן לחזור לעבודה!' : 'זמן להפסקה!';
        NotificationHandler.showNotification('TimeMaster', message);
        
        this.saveState();
    }

    updateDisplay() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;
        this.timerDisplay.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    saveState() {
        localStorage.setItem('pomodoroState', JSON.stringify({
            currentTime: this.currentTime,
            isWorkTime: this.isWorkTime,
            workTime: this.workTime,
            breakTime: this.breakTime,
            timestamp: Date.now()
        }));
    }

    loadState() {
        const savedState = localStorage.getItem('pomodoroState');
        if (savedState) {
            const state = JSON.parse(savedState);
            this.workTime = state.workTime;
            this.breakTime = state.breakTime;
            this.isWorkTime = state.isWorkTime;
            this.currentTime = state.currentTime;
            
            this.workTimeInput.value = this.workTime / 60;
            this.breakTimeInput.value = this.breakTime / 60;
            this.statusText.textContent = this.isWorkTime ? 'זמן עבודה' : 'זמן הפסקה';
            this.updateDisplay();
        }
    }
}

// רישום Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('sw.js', {
                scope: '.'
            });
            console.log('ServiceWorker נרשם בהצלחה');

            if ('Notification' in window) {
                if (Notification.permission === 'default') {
                    await NotificationHandler.requestPermission();
                }
            }

        } catch (error) {
            console.error('שגיאה ברישום ServiceWorker:', error);
        }
    });
}

// יצירת המופע של הטיימר
const pomodoro = new PomodoroTimer();
