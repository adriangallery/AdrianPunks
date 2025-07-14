// Intro Screen - Handles the introduction sequence
class IntroScreen extends GameScreen {
    constructor() {
        const config = {
            backgroundImage: 'intro.png',
            hotspots: [],
            music: null
        };
        
        super('intro', config);
        this.introTimer = null;
        this.progressInterval = null;
    }

    // Override init for intro-specific setup
    init() {
        super.init();
        this.createIntroElements();
    }

    // Create intro-specific elements
    createIntroElements() {
        // Create progress bar
        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-container';
        progressContainer.style.display = 'none';
        
        progressContainer.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <div class="progress-text">LOADING...</div>
        `;
        
        this.element.appendChild(progressContainer);
        this.progressContainer = progressContainer;
        this.progressFill = progressContainer.querySelector('.progress-fill');
        this.progressText = progressContainer.querySelector('.progress-text');
    }

    // Override show for intro sequence
    show() {
        super.show();
        this.startIntroSequence();
    }

    // Start the intro sequence
    startIntroSequence() {
        // Reset progress bar
        this.progressFill.style.width = '0%';
        this.progressText.textContent = 'LOADING...';
        
        // Show progress bar
        this.progressContainer.style.display = 'block';
        
        // Fade in intro image
        this.background.style.opacity = '0';
        this.background.style.transition = 'opacity 2s ease-in-out';
        
        // Start progress bar animation for fade in
        this.startProgressBar(0, 50, 2000, () => {
            // Progress bar complete for fade in
            console.log('Fade in progress complete - 50%');
            
            // Automatically continue to 100% after fade in
            this.startProgressBar(50, 100, 5000, () => {
                // Progress bar complete for fade out
                this.progressText.textContent = 'COMPLETE!';
                console.log('Fade out progress complete - 100%');
                
                // Hide progress bar after completion
                setTimeout(() => {
                    this.progressContainer.style.display = 'none';
                    console.log('Progress bar hidden');
                }, 500);
            });
            
            // Start transition to main screen
            this.goToMainScreenFromIntro();
        });
        
        setTimeout(() => {
            this.background.style.opacity = '1';
        }, 100);
    }

    // Start progress bar animation
    startProgressBar(startPercent, endPercent, duration, callback) {
        const startTime = Date.now();
        const startWidth = startPercent;
        const endWidth = endPercent;
        
        // Clear any existing interval
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
        
        console.log(`Starting progress bar: ${startPercent}% to ${endPercent}% over ${duration}ms`);
        
        this.progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentWidth = startWidth + (endWidth - startWidth) * progress;
            this.progressFill.style.width = currentWidth + '%';
            
            console.log(`Progress: ${currentWidth.toFixed(1)}%`);
            
            if (progress >= 1) {
                clearInterval(this.progressInterval);
                if (callback) callback();
            }
        }, 50);
    }

    // Handle intro click
    handleIntroClick(event) {
        // Prevent multiple rapid clicks
        if (this.introTimer) return;
        
        this.introTimer = setTimeout(() => {
            this.introTimer = null;
        }, 1000);
        
        // Skip intro and go directly to main screen
        this.goToMainScreenFromIntro();
    }

    // Go to main screen from intro
    goToMainScreenFromIntro() {
        console.log('Transitioning from intro to main screen');
        
        // Clear any progress intervals
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
        
        // Hide intro screen
        this.hide();
        
        // Show main screen (basement)
        gameEngine.changeScreen('basement');
    }

    // Override setupEventListeners for intro-specific handling
    setupEventListeners() {
        // Intro screen - use both click and touch events
        this.element.addEventListener('click', (e) => this.handleIntroClick(e), true);
        this.element.addEventListener('touchstart', (e) => this.handleIntroClick(e), true);
    }
} 