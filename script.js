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
        if (!('Notification' in window)) {
            alert('הדפדפן שלך לא תומך בהתראות');
            return false;
        }
        
        if (Notification.permission === 'default') {
            // מבקש הרשאה מהמשתמש
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                // משתמש בהתראת בדיקה
                new Notification('התראות הופעלו בהצלחה!', {
                    body: 'תקבל התראה כשהטיימר יסתיים',
                    icon: 'logo1.png'
                });
                return true;
            }
        }

        return Notification.permission === 'granted';
    }

    static async showNotification(title, message) {
        // קודם מנסה לשלוח התראת דפדפן רגילה
        if (Notification.permission === 'granted') {
            try {
                // אם יש Service Worker, משתמש בו
                if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
                    const registration = await navigator.serviceWorker.ready;
                    await registration.showNotification(title, {
                        body: message,
                        icon: 'logo1.png',
                        badge: 'logo3.png',
                        vibrate: [200, 100, 200],
                        requireInteraction: true
                    });
                } else {
                    // אחרת משתמש בהתראה רגילה
                    new Notification(title, {
                        body: message,
                        icon: 'logo1.png'
                    });
                }

                // מנסה להפעיל רטט אם אפשר
                if ('vibrate' in navigator) {
                    navigator.vibrate([200, 100, 200]);
                }
            } catch (error) {
                console.error('שגיאה בשליחת התראה:', error);
            }
        }

        // בכל מקרה מציג גם התראה מקומית באתר
        NotificationHandler.showLocalNotification(title, message);
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
            navigator.vibrate([200, 100, 200]);
        }

        setTimeout(() => notification.remove(), 5000);
    }
}

class PowerManager {
    constructor() {
        this.wakeLock = null;
        this.wakeLockSupported = 'wakeLock' in navigator;
        this.batteryManager = null;
        this.initBatteryManager();
        this.initWakeLock();
    }

    async initBatteryManager() {
        if ('getBattery' in navigator) {
            try {
                this.batteryManager = await navigator.getBattery();
                this.batteryManager.addEventListener('levelchange', () => this.handleBatteryChange());
                this.batteryManager.addEventListener('chargingchange', () => this.handleBatteryChange());
            } catch (error) {
                console.warn('Battery API לא נתמך:', error);
            }
        }
    }

    async initWakeLock() {
        const wakeLockToggle = document.getElementById('preventSleepEnabled');
        const wakeLockStatus = document.getElementById('wakeLockStatus');
        
        if (this.wakeLockSupported && !isIOS) {
            wakeLockToggle.addEventListener('change', async (e) => {
                if (e.target.checked) {
                    await this.acquireWakeLock();
                } else {
                    this.releaseWakeLock();
                }
            });
        } else {
            wakeLockToggle.disabled = true;
            wakeLockStatus.textContent = 'מניעת שינה לא נתמכת במכשיר זה';
        }
    }

    async acquireWakeLock() {
        if (this.wakeLockSupported && !isIOS) {
            try {
                this.wakeLock = await navigator.wakeLock.request('screen');
                document.getElementById('wakeLockStatus').textContent = 'מסך פעיל';
                document.getElementById('wakeLockStatus').className = 'wake-lock-status active';
            } catch (error) {
                console.warn('שגיאה במניעת שינה:', error);
            }
        }
    }

    releaseWakeLock() {
        if (this.wakeLock) {
            this.wakeLock.release();
            this.wakeLock = null;
            document.getElementById('wakeLockStatus').textContent = 'מסך כבוי';
            document.getElementById('wakeLockStatus').className = 'wake-lock-status inactive';
        }
    }

    handleBatteryChange() {
        if (this.batteryManager) {
            const batteryLevel = this.batteryManager.level * 100;
            const isCharging = this.batteryManager.charging;
            
            if (!isCharging && batteryLevel < 20) {
                document.getElementById('powerMode').value = 'efficient';
                this.adjustPowerSettings('efficient');
                NotificationHandler.showLocalNotification('סוללה חלשה', 'עובר למצב חסכוני');
            } else if (isCharging || batteryLevel > 50) {
                document.getElementById('powerMode').value = 'balanced';
                this.adjustPowerSettings('balanced');
            }
        }
    }

    adjustPowerSettings(mode) {
        switch (mode) {
            case 'aggressive': this.setHighPowerMode(); break;
            case 'balanced': this.setBalancedMode(); break;
            case 'efficient': this.setEfficientMode(); break;
        }
    }

    setHighPowerMode() {
        if (this.wakeLockSupported && !isIOS) {
            this.acquireWakeLock();
        }
    }

    setBalancedMode() {
        this.releaseWakeLock();
    }

    setEfficientMode() {
        this.releaseWakeLock();
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
        
        this.powerManager = new PowerManager();
        this.initializeElements();
        this.initializeEventListeners();
        this.loadState();

        // מבקש הרשאת התראות בהתחלה
        NotificationHandler.requestPermission().then(granted => {
            if (granted) {
                document.getElementById('notificationsEnabled').checked = true;
                NotificationHandler.showLocalNotification(
                    'התראות',
                    'התראות הופעלו בהצלחה!'
                );
            } else {
                document.getElementById('notificationsEnabled').checked = false;
                NotificationHandler.showLocalNotification(
                    'התראות',
                    'לקבלת התראות, אנא אשר התראות בדפדפן'
                );
            }
        });
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

        // מאזין לשינויים בהתראות
        document.getElementById('notificationsEnabled').addEventListener('change', async (e) => {
            if (e.target.checked) {
                const granted = await NotificationHandler.requestPermission();
                e.target.checked = granted;
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
            const registration = await navigator.serviceWorker.register('sw.js');
            console.log('ServiceWorker registration successful');
        } catch (err) {
            console.log('ServiceWorker registration failed: ', err);
        }
    });
}

// יצירת המופע של הטיימר
const pomodoro = new PomodoroTimer();
