/**
 * Animation Controller with GSAP and ScrollTrigger
 * Apple-inspired smooth animations
 */

class AnimationController {
    constructor() {
        this.isEnabled = true;
        this.defaultDuration = 0.6;
        this.defaultEase = 'power2.out';
        this.staggerAmount = 0.08;
    }

    /**
     * Animate search results entry
     */
    animateResults() {
        if (!this.isEnabled || typeof gsap === 'undefined') return;

        const results = document.querySelectorAll('.result-card, .image-item');
        if (results.length === 0) return;

        gsap.fromTo(results,
            {
                opacity: 0,
                y: 20,
                scale: 0.98
            },
            {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: this.defaultDuration,
                ease: this.defaultEase,
                stagger: {
                    amount: this.staggerAmount * results.length,
                    from: 'start'
                },
                clearProps: 'all'
            }
        );
    }

    /**
     * Animate view transitions (start, search, settings)
     */
    animateViewTransition(view) {
        if (!this.isEnabled || typeof gsap === 'undefined') return;

        const viewElement = document.querySelector(`.${view}-page, .${view}-view`);
        if (!viewElement) return;

        gsap.fromTo(viewElement,
            {
                opacity: 0,
                y: 15,
                scale: 0.98
            },
            {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.5,
                ease: 'power2.out',
                clearProps: 'all'
            }
        );
    }

    /**
     * Animate logo on start page
     */
    animateStartLogo() {
        if (!this.isEnabled || typeof gsap === 'undefined') return;

        const logo = document.querySelector('.start-logo-icon');
        if (!logo) return;

        gsap.from(logo, {
            scale: 0.8,
            opacity: 0,
            duration: 0.8,
            ease: 'back.out(1.7)',
            delay: 0.2
        });
    }

    /**
     * Animate settings cards
     */
    animateSettingsCards() {
        if (!this.isEnabled || typeof gsap === 'undefined') return;

        const sections = document.querySelectorAll('.settings-section');
        if (sections.length === 0) return;

        gsap.fromTo(sections,
            {
                opacity: 0,
                y: 20
            },
            {
                opacity: 1,
                y: 0,
                duration: 0.5,
                ease: this.defaultEase,
                stagger: 0.1
            }
        );
    }

    /**
     * Animate suggestions dropdown
     */
    animateSuggestions(element) {
        if (!this.isEnabled || typeof gsap === 'undefined' || !element) return;

        const items = element.querySelectorAll('.suggestion-item, .start-suggestion-item');
        
        gsap.fromTo(items,
            {
                opacity: 0,
                x: -10
            },
            {
                opacity: 1,
                x: 0,
                duration: 0.3,
                ease: this.defaultEase,
                stagger: 0.05
            }
        );
    }

    /**
     * Animate history cards on start page
     */
    animateHistoryCards() {
        if (!this.isEnabled || typeof gsap === 'undefined') return;

        const cards = document.querySelectorAll('.start-history-card');
        if (cards.length === 0) return;

        gsap.fromTo(cards,
            {
                opacity: 0,
                y: 15,
                scale: 0.95
            },
            {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.4,
                ease: this.defaultEase,
                stagger: 0.06
            }
        );
    }

    /**
     * Animate pagination
     */
    animatePagination() {
        if (!this.isEnabled || typeof gsap === 'undefined') return;

        const pagination = document.querySelector('.pagination');
        if (!pagination) return;

        gsap.from(pagination, {
            opacity: 0,
            y: 10,
            duration: 0.4,
            ease: this.defaultEase
        });
    }

    /**
     * Scroll to element smoothly
     */
    scrollToElement(element, offset = 0) {
        if (!this.isEnabled || typeof gsap === 'undefined' || !element) return;

        gsap.to(window, {
            scrollTo: {
                y: element,
                offsetY: offset
            },
            duration: 0.8,
            ease: 'power2.inOut'
        });
    }

    /**
     * Create hover animation for interactive elements
     */
    createHoverAnimation(element, scaleAmount = 1.02) {
        if (!this.isEnabled || typeof gsap === 'undefined' || !element) return;

        element.addEventListener('mouseenter', () => {
            gsap.to(element, {
                scale: scaleAmount,
                duration: 0.3,
                ease: 'power2.out'
            });
        });

        element.addEventListener('mouseleave', () => {
            gsap.to(element, {
                scale: 1,
                duration: 0.3,
                ease: 'power2.out'
            });
        });
    }

    /**
     * Animate skeleton loading
     */
    animateSkeleton() {
        if (!this.isEnabled || typeof gsap === 'undefined') return;

        const skeletons = document.querySelectorAll('.skeleton');
        if (skeletons.length === 0) return;

        skeletons.forEach(skeleton => {
            gsap.to(skeleton, {
                opacity: 0.5,
                duration: 0.8,
                ease: 'power1.inOut',
                repeat: -1,
                yoyo: true
            });
        });
    }

    /**
     * Enable/disable animations
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        
        if (!enabled && typeof gsap !== 'undefined') {
            gsap.globalTimeline.clear();
        }
    }

    /**
     * Kill all running animations
     */
    killAll() {
        if (typeof gsap !== 'undefined') {
            gsap.globalTimeline.clear();
        }
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationController;
}