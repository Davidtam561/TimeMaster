// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
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
                console.warn('Battery API not supported:', error);
            }
        }
    }

    async initWakeLock() {
        const wakeLockToggle = document.getElementById('preventSleepEnabled');
        const wakeLockStatus = document.getElementById('wakeLockStatus');
        if (this.wakeLockSupported) {
            wakeLockToggle.addEventListener('change', async (e) => {
                if (e.target.checked) {
                    await this.acquireWakeLock();
                } else {
                    this.releaseWakeLock();
                }
            });
        } else {
            wakeLockToggle.disabled = true;
            wakeLockStatus.textContent = 'Wake Lock לא נתמך בדפדפן זה';
        }
    }

    async acquireWakeLock() {
        if (this.wakeLockSupported) {
            try {
                this.wakeLock = await navigator.wakeLock.request('screen');
                document.getElementById('wakeLockStatus').textContent = 'מסך פעיל';
                document.getElementById('wakeLockStatus').className = 'wake-lock-status active';
            } catch (error) {
                console.warn('Wake Lock request failed:', error);
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
        if (this.wakeLockSupported) { this.acquireWakeLock(); }
    }

    setBalancedMode() {
        if (this.wakeLockSupported) { this.releaseWakeLock(); }
    }

    setEfficientMode() {
        this.releaseWakeLock();
    }
}

class NotificationManager {
    constructor() {
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        this.hasNotificationAPI = 'Notification' in window;
        this.initNotificationSettings();
    }

    async initNotificationSettings() {
        const notificationsToggle = document.getElementById('notificationsEnabled');
        if (!this.hasNotificationAPI) {
            notificationsToggle.disabled = true;
            return;
        }

        notificationsToggle.addEventListener('change', async (e) => {
            await this.toggleNotifications(e.target.checked);
        });

        if (this.isIOS) {
            this.showIOSInstallMessage();
        }
    }

    showIOSInstallMessage() {
        const message = document.createElement('div');
        message.className = 'system-message info';
        message.textContent = 'להתראות מלאות באייפון, הוסף את האפליקציה למסך הבית';
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 5000);
    }

    async toggleNotifications(enabled) {
        if (!enabled) return;

        try {
            const permission = await Notification.requestPermission();
            const systemMessage = document.getElementById('systemMessage');
            
            if (permission === 'granted') {
                systemMessage.textContent = 'התראות הופעלו בהצלחה';
                systemMessage.className = 'system-message info';
            } else {
                document.getElementById('notificationsEnabled').checked = false;
                systemMessage.textContent = 'נא לאשר התראות בדפדפן';
                systemMessage.className = 'system-message error';
            }
            
            systemMessage.style.display = 'block';
            setTimeout(() => systemMessage.style.display = 'none', 3000);
            
        } catch (error) {
            console.error('שגיאה בהפעלת התראות:', error);
        }
    }

    async showNotification(title, message) {
        if (!this.hasNotificationAPI || !document.getElementById('notificationsEnabled').checked) {
            return;
        }

        try {
            if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(title, {
                    body: message,
                    icon: './logo1.png',
                    badge: './logo3.png',
                    vibrate: [200, 100, 200],
                    requireInteraction: true,
                    silent: false
                });
            } else {
                new Notification(title, {
                    body: message,
                    icon: './logo1.png'
                });
            }
        } catch (error) {
            console.error('שגיאה בשליחת התראה:', error);
        }
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
        this.notificationManager = new NotificationManager();
        
        this.timerDisplay = document.getElementById('timer');
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.statusText = document.getElementById('status');
        this.workTimeInput = document.getElementById('workTime');
        this.breakTimeInput = document.getElementById('breakTime');
        
        this.initializeEventListeners();
        this.loadState();
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
        this.notificationManager.showNotification('TimeMaster', message);
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
            breakTime: this.breakTime
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

// Initialize the timer
const pomodoro = new PomodoroTimer();
