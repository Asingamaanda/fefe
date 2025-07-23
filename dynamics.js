// Dynamic content management for FEFE Holdings
class FEFEDynamics {
    constructor() {
        this.init();
    }

    init() {
        this.setupDynamicCounters();
        this.setupLiveUpdates();
        this.setupInteractiveElements();
        this.setupContentRotation();
    }

    // Dynamic counters with real-time updates
    setupDynamicCounters() {
        const counters = [
            { element: '.students-count', target: 1247, suffix: '+' },
            { element: '.projects-count', target: 89, suffix: '+' },
            { element: '.companies-count', target: 4, suffix: '' },
            { element: '.countries-count', target: 23, suffix: '+' }
        ];

        counters.forEach(counter => {
            this.animateCounter(counter);
            // Update counter every 5 minutes with slight variations
            setInterval(() => {
                counter.target += Math.floor(Math.random() * 3);
                this.animateCounter(counter);
            }, 300000);
        });
    }

    animateCounter(counter) {
        const element = document.querySelector(counter.element);
        if (!element) return;

        let current = 0;
        const increment = counter.target / 100;
        const timer = setInterval(() => {
            current += increment;
            if (current >= counter.target) {
                element.textContent = counter.target + counter.suffix;
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current) + counter.suffix;
            }
        }, 20);
    }

    // Live updates and news feed
    setupLiveUpdates() {
        const updates = [
            "🎉 New student enrolled in Ngoma Curriculum - Welcome Sarah from Kenya!",
            "🌟 FEFE Wear just launched new sustainable collection",
            "🤖 AI Education platform now supports 5 new languages",
            "💼 Web Solutions completed another enterprise project",
            "🥜 FEFE Nuts now shipping to 25+ countries worldwide",
            "📚 500+ students completed courses this month",
            "🌍 New partnership formed with educational institutions",
            "🎨 Fresh designs added to FEFE Wear collection"
        ];

        let currentIndex = 0;
        const updateElement = document.querySelector('.live-updates');
        
        if (updateElement) {
            setInterval(() => {
                updateElement.style.opacity = '0';
                setTimeout(() => {
                    updateElement.textContent = updates[currentIndex];
                    updateElement.style.opacity = '1';
                    currentIndex = (currentIndex + 1) % updates.length;
                }, 500);
            }, 4000);
        }
    }

    // Interactive elements and dynamic content
    setupInteractiveElements() {
        // Dynamic testimonials
        this.rotateTestimonials();
        
        // Interactive company cards
        this.setupCompanyCards();
        
        // Dynamic pricing updates
        this.updatePricing();
    }

    rotateTestimonials() {
        const testimonials = [
            {
                text: "FEFE Nuts are absolutely delicious! The packaging is beautiful and the quality is exceptional.",
                author: "Maria Rodriguez",
                company: "Food Blogger"
            },
            {
                text: "Ngoma Curriculum transformed how my children learn. The interactive lessons are engaging and effective.",
                author: "David Johnson",
                company: "Parent"
            },
            {
                text: "FEFE Web Solutions delivered our project on time and exceeded expectations. Highly recommend!",
                author: "Sarah Chen",
                company: "Tech Startup CEO"
            },
            {
                text: "The AI Education platform is revolutionary. Our students' performance improved by 40%.",
                author: "Dr. Michael Brown",
                company: "University Professor"
            }
        ];

        const testimonialElement = document.querySelector('.dynamic-testimonial');
        if (!testimonialElement) return;

        let currentTestimonial = 0;
        setInterval(() => {
            const testimonial = testimonials[currentTestimonial];
            testimonialElement.innerHTML = `
                <blockquote>
                    <p>"${testimonial.text}"</p>
                    <footer>
                        <strong>${testimonial.author}</strong><br>
                        <em>${testimonial.company}</em>
                    </footer>
                </blockquote>
            `;
            currentTestimonial = (currentTestimonial + 1) % testimonials.length;
        }, 6000);
    }

    setupCompanyCards() {
        document.querySelectorAll('.company-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                this.loadDynamicCompanyData(card);
            });
        });
    }

    loadDynamicCompanyData(card) {
        const companyName = card.querySelector('h3').textContent;
        const dynamicData = this.getCompanyData(companyName);
        
        const existingStats = card.querySelector('.dynamic-stats');
        if (existingStats) existingStats.remove();

        const statsDiv = document.createElement('div');
        statsDiv.className = 'dynamic-stats';
        statsDiv.style.cssText = `
            margin-top: 1rem;
            padding: 0.5rem;
            background: rgba(139, 115, 85, 0.1);
            border-radius: 8px;
            font-size: 0.8rem;
            color: #8B7355;
        `;
        statsDiv.innerHTML = `
            <div>📊 ${dynamicData.activeUsers} active users</div>
            <div>⭐ ${dynamicData.rating}/5 rating</div>
            <div>🚀 ${dynamicData.growth}% growth this month</div>
        `;
        
        card.appendChild(statsDiv);
    }

    getCompanyData(companyName) {
        const data = {
            'FEFE Wear': {
                activeUsers: Math.floor(Math.random() * 1000) + 500,
                rating: (4.5 + Math.random() * 0.5).toFixed(1),
                growth: Math.floor(Math.random() * 20) + 10
            },
            'Ngoma Curriculum': {
                activeUsers: Math.floor(Math.random() * 800) + 300,
                rating: (4.6 + Math.random() * 0.4).toFixed(1),
                growth: Math.floor(Math.random() * 25) + 15
            },
            'FEFE AI Education': {
                activeUsers: Math.floor(Math.random() * 1200) + 800,
                rating: (4.7 + Math.random() * 0.3).toFixed(1),
                growth: Math.floor(Math.random() * 30) + 20
            },
            'FEFE Web Solutions': {
                activeUsers: Math.floor(Math.random() * 600) + 200,
                rating: (4.8 + Math.random() * 0.2).toFixed(1),
                growth: Math.floor(Math.random() * 15) + 8
            }
        };
        return data[companyName] || { activeUsers: 0, rating: '4.5', growth: 10 };
    }

    updatePricing() {
        // Dynamic pricing updates for seasonal offers
        const priceElements = document.querySelectorAll('.product-price, .price');
        priceElements.forEach(element => {
            const originalPrice = element.textContent;
            if (Math.random() < 0.3) { // 30% chance of showing discount
                const discount = Math.floor(Math.random() * 20) + 5; // 5-25% discount
                element.innerHTML = `
                    <span style="text-decoration: line-through; color: #999; font-size: 0.9em;">${originalPrice}</span><br>
                    <span style="color: #8B7355; font-weight: bold;">-${discount}% OFF!</span>
                `;
            }
        });
    }

    setupContentRotation() {
        // Rotate featured content every 10 seconds
        const featuredContent = [
            {
                title: "🥜 FEFE Nuts - Premium Quality",
                description: "Discover our signature macadamia collection in 4 amazing flavors"
            },
            {
                title: "👕 FEFE Wear - Sustainable Fashion",
                description: "Eco-friendly clothing inspired by natural beauty"
            },
            {
                title: "🎓 Ngoma Curriculum - Interactive Learning",
                description: "Transform education with our comprehensive platform"
            },
            {
                title: "🤖 AI Education - Future of Learning",
                description: "Personalized education powered by artificial intelligence"
            }
        ];

        const rotatingElement = document.querySelector('.rotating-feature');
        if (!rotatingElement) return;

        let currentFeature = 0;
        setInterval(() => {
            const feature = featuredContent[currentFeature];
            rotatingElement.innerHTML = `
                <h3>${feature.title}</h3>
                <p>${feature.description}</p>
            `;
            currentFeature = (currentFeature + 1) % featuredContent.length;
        }, 10000);
    }
}

// Dynamic product management for FEFE Wear
class FEFEWearDynamics {
    constructor() {
        this.cart = JSON.parse(localStorage.getItem('fefeCart')) || [];
        this.wishlist = JSON.parse(localStorage.getItem('fefeWishlist')) || [];
        this.recentlyViewed = JSON.parse(localStorage.getItem('fefeRecentlyViewed')) || [];
        this.init();
    }

    init() {
        this.setupDynamicInventory();
        this.setupPersonalization();
        this.setupRecommendations();
        this.updateCartDisplay();
    }

    setupDynamicInventory() {
        const products = document.querySelectorAll('.product-card');
        products.forEach(product => {
            const stock = Math.floor(Math.random() * 20) + 5;
            this.addStockIndicator(product, stock);
            this.addRealtimeViews(product);
        });
    }

    addStockIndicator(product, stock) {
        const stockDiv = document.createElement('div');
        stockDiv.className = 'stock-indicator';
        stockDiv.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: ${stock < 10 ? '#e74c3c' : '#27ae60'};
            color: white;
            padding: 0.2rem 0.5rem;
            border-radius: 15px;
            font-size: 0.7rem;
            font-weight: bold;
        `;
        stockDiv.textContent = stock < 10 ? `Only ${stock} left!` : `${stock} in stock`;
        
        const productInfo = product.querySelector('.product-info');
        productInfo.style.position = 'relative';
        productInfo.appendChild(stockDiv);
    }

    addRealtimeViews(product) {
        const viewers = Math.floor(Math.random() * 15) + 3;
        const viewsDiv = document.createElement('div');
        viewsDiv.className = 'realtime-views';
        viewsDiv.style.cssText = `
            margin-top: 0.5rem;
            color: #8B7355;
            font-size: 0.8rem;
            font-style: italic;
        `;
        viewsDiv.innerHTML = `👀 ${viewers} people viewing this item`;
        
        product.querySelector('.product-info').appendChild(viewsDiv);
        
        // Update viewer count periodically
        setInterval(() => {
            const newViewers = Math.max(1, viewers + Math.floor(Math.random() * 6) - 3);
            viewsDiv.innerHTML = `👀 ${newViewers} people viewing this item`;
        }, 8000);
    }

    setupPersonalization() {
        // Track user preferences and show personalized content
        const userPreferences = this.getUserPreferences();
        this.showPersonalizedRecommendations(userPreferences);
    }

    getUserPreferences() {
        // Analyze cart and wishlist to determine preferences
        const categories = this.cart.concat(this.wishlist).map(item => item.category);
        const mostLiked = categories.reduce((a, b, i, arr) => 
            arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b, null
        );
        return { preferredCategory: mostLiked || 'shirts' };
    }

    showPersonalizedRecommendations(preferences) {
        const recommendedSection = document.createElement('div');
        recommendedSection.className = 'personalized-recommendations';
        recommendedSection.innerHTML = `
            <div style="background: #F5F0E8; padding: 1rem; border-radius: 10px; margin: 2rem 0;">
                <h3 style="color: #8B7355; margin-bottom: 0.5rem;">🎯 Recommended for You</h3>
                <p style="color: #666; margin: 0;">Based on your interests in ${preferences.preferredCategory}</p>
            </div>
        `;
        
        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(recommendedSection, container.firstChild);
        }
    }

    setupRecommendations() {
        // Add "Customers also bought" section
        const recommendations = [
            "FEFE Nuts Variety Pack",
            "Organic Cotton FEFE Cap",
            "FEFE Branded Water Bottle",
            "Sustainable FEFE Notebook"
        ];

        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', () => {
                this.showRecommendations(recommendations);
            });
        });
    }

    showRecommendations(items) {
        const existing = document.querySelector('.recommendations-popup');
        if (existing) existing.remove();

        const popup = document.createElement('div');
        popup.className = 'recommendations-popup';
        popup.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            border: 1px solid #8B7355;
            border-radius: 10px;
            padding: 1rem;
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
            z-index: 1000;
            max-width: 250px;
        `;
        popup.innerHTML = `
            <h4 style="color: #8B7355; margin: 0 0 0.5rem 0; font-size: 0.9rem;">Customers also bought:</h4>
            ${items.slice(0, 3).map(item => `<div style="font-size: 0.8rem; margin: 0.2rem 0;">• ${item}</div>`).join('')}
            <button onclick="this.parentElement.remove()" style="
                position: absolute; top: 5px; right: 8px; background: none; 
                border: none; color: #999; cursor: pointer; font-size: 1.2rem;
            ">×</button>
        `;
        
        document.body.appendChild(popup);
        
        setTimeout(() => {
            if (popup.parentElement) popup.remove();
        }, 8000);
    }

    updateCartDisplay() {
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            cartCount.textContent = this.cart.length;
        }
    }
}

// Dynamic curriculum management for Ngoma
class NgomaDynamics {
    constructor() {
        this.enrolledStudents = parseInt(localStorage.getItem('enrolledStudents')) || 547;
        this.activeClasses = parseInt(localStorage.getItem('activeClasses')) || 23;
        this.init();
    }

    init() {
        this.setupLiveClassrooms();
        this.setupProgressTracking();
        this.setupStudentActivity();
        this.updateEnrollmentStats();
    }

    setupLiveClassrooms() {
        const classStatus = [
            { name: "Math Grade 8", students: 24, status: "live" },
            { name: "Science Grade 10", students: 18, status: "starting-soon" },
            { name: "English Grade 7", students: 31, status: "break" },
            { name: "History Grade 9", students: 15, status: "live" }
        ];

        const liveSection = document.createElement('div');
        liveSection.className = 'live-classrooms';
        liveSection.innerHTML = `
            <div style="background: #f8f9fa; padding: 2rem; border-radius: 15px; margin: 2rem 0;">
                <h3 style="color: #333; margin-bottom: 1rem;">🔴 Live Classrooms</h3>
                <div class="classroom-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    ${classStatus.map(cls => `
                        <div style="
                            background: white; 
                            padding: 1rem; 
                            border-radius: 10px; 
                            border-left: 4px solid ${this.getStatusColor(cls.status)};
                        ">
                            <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem;">${cls.name}</h4>
                            <p style="margin: 0; font-size: 0.8rem; color: #666;">
                                👥 ${cls.students} students<br>
                                ${this.getStatusText(cls.status)}
                            </p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        const container = document.querySelector('.container');
        if (container) {
            container.appendChild(liveSection);
        }

        // Update classroom status every 30 seconds
        setInterval(() => {
            this.updateClassroomStatus();
        }, 30000);
    }

    getStatusColor(status) {
        const colors = {
            'live': '#e74c3c',
            'starting-soon': '#f39c12',
            'break': '#3498db'
        };
        return colors[status] || '#95a5a6';
    }

    getStatusText(status) {
        const texts = {
            'live': '🔴 Live now',
            'starting-soon': '⏰ Starting in 5 min',
            'break': '☕ On break'
        };
        return texts[status] || '📚 Scheduled';
    }

    updateClassroomStatus() {
        const classrooms = document.querySelectorAll('.classroom-grid > div');
        classrooms.forEach(classroom => {
            const studentCount = classroom.querySelector('p');
            const currentCount = parseInt(studentCount.textContent.match(/\d+/)[0]);
            const change = Math.floor(Math.random() * 6) - 3; // -3 to +3 change
            const newCount = Math.max(5, currentCount + change);
            studentCount.innerHTML = studentCount.innerHTML.replace(/\d+/, newCount);
        });
    }

    setupProgressTracking() {
        // Real-time progress updates
        const progressData = [
            { subject: "Mathematics", completion: 78 },
            { subject: "Science", completion: 65 },
            { subject: "English", completion: 82 },
            { subject: "History", completion: 71 }
        ];

        const progressSection = document.createElement('div');
        progressSection.className = 'progress-tracking';
        progressSection.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 15px; margin: 2rem 0; box-shadow: 0 5px 15px rgba(0,0,0,0.08);">
                <h3 style="color: #333; margin-bottom: 1rem;">📊 Student Progress Overview</h3>
                ${progressData.map(subject => `
                    <div style="margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span style="font-weight: 500;">${subject.subject}</span>
                            <span style="color: #3498db;">${subject.completion}%</span>
                        </div>
                        <div style="background: #e9ecef; height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="
                                background: linear-gradient(135deg, #3498db, #2ecc71); 
                                height: 100%; 
                                width: ${subject.completion}%; 
                                transition: width 0.5s ease;
                            "></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        const container = document.querySelector('.container');
        if (container) {
            container.appendChild(progressSection);
        }
    }

    setupStudentActivity() {
        const activities = [
            "🎉 Sarah completed Math Quiz with 95% score",
            "📚 Mike started new Science chapter",
            "⭐ Emma earned 'Star Student' badge",
            "🔬 Class 8B finished virtual lab experiment",
            "📝 15 students submitted History essays",
            "🎯 John achieved learning milestone"
        ];

        const activityFeed = document.createElement('div');
        activityFeed.className = 'student-activity-feed';
        activityFeed.innerHTML = `
            <div style="
                position: fixed; 
                top: 120px; 
                left: 20px; 
                background: white; 
                border: 1px solid #e1e5e9; 
                border-radius: 10px; 
                padding: 1rem; 
                max-width: 300px; 
                z-index: 500;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            ">
                <h4 style="margin: 0 0 0.5rem 0; color: #3498db; font-size: 0.9rem;">Live Activity Feed</h4>
                <div class="activity-item" style="font-size: 0.8rem; color: #666;"></div>
            </div>
        `;

        document.body.appendChild(activityFeed);

        let currentActivity = 0;
        setInterval(() => {
            const activityItem = activityFeed.querySelector('.activity-item');
            activityItem.style.opacity = '0';
            setTimeout(() => {
                activityItem.textContent = activities[currentActivity];
                activityItem.style.opacity = '1';
                currentActivity = (currentActivity + 1) % activities.length;
            }, 300);
        }, 5000);
    }

    updateEnrollmentStats() {
        // Simulate real-time enrollment updates
        setInterval(() => {
            if (Math.random() < 0.3) { // 30% chance of new enrollment
                this.enrolledStudents++;
                localStorage.setItem('enrolledStudents', this.enrolledStudents.toString());
                
                const statElement = document.querySelector('.students-enrolled');
                if (statElement) {
                    statElement.textContent = this.enrolledStudents + '+';
                }
            }
        }, 60000); // Check every minute
    }
}

// AI Education dynamics
class AIEducationDynamics {
    constructor() {
        this.init();
    }

    init() {
        this.setupAIDemo();
        this.setupRealTimeMetrics();
        this.setupGlobalMap();
    }

    setupAIDemo() {
        // Enhanced AI chatbot with more realistic responses
        const advancedResponses = {
            'help': 'I can assist you with various subjects including mathematics, science, literature, history, and more. I also provide personalized learning paths and track your progress.',
            'explain': 'I can explain complex concepts by breaking them down into simple, understandable parts. Would you like me to explain a specific topic?',
            'quiz': 'I can create personalized quizzes based on your learning level and interests. What subject would you like to be quizzed on?',
            'progress': 'I track your learning progress and identify areas where you excel and areas that need improvement. Would you like to see your progress report?',
            'languages': 'I support over 100 languages and can translate explanations in real-time. What language would you prefer?',
            'adaptive': 'My adaptive learning algorithm adjusts content difficulty based on your performance, ensuring optimal learning pace.',
            'feedback': 'I provide instant feedback on your answers and suggest additional resources for improvement.',
            'default': 'I\'m an advanced AI tutor powered by machine learning. I can help with homework, create study plans, explain concepts, and track your learning progress. What would you like to explore today?'
        };

        // Override the existing generateAIResponse function
        window.generateAIResponse = (message) => {
            const lowerMessage = message.toLowerCase();
            
            for (let keyword in advancedResponses) {
                if (lowerMessage.includes(keyword)) {
                    return advancedResponses[keyword];
                }
            }
            
            return advancedResponses['default'];
        };
    }

    setupRealTimeMetrics() {
        const metrics = {
            activeUsers: 12847,
            questionsAnswered: 45632,
            successRate: 94.2,
            avgResponseTime: 0.3
        };

        const metricsDisplay = document.createElement('div');
        metricsDisplay.className = 'realtime-metrics';
        metricsDisplay.innerHTML = `
            <div style="
                position: fixed; 
                bottom: 20px; 
                left: 20px; 
                background: linear-gradient(135deg, #667eea, #764ba2); 
                color: white; 
                padding: 1rem; 
                border-radius: 10px; 
                z-index: 1000;
                min-width: 200px;
            ">
                <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem;">🤖 AI Metrics Live</h4>
                <div style="font-size: 0.8rem;">
                    <div>👥 Active: <span class="active-users">${metrics.activeUsers}</span></div>
                    <div>❓ Questions: <span class="questions-count">${metrics.questionsAnswered}</span></div>
                    <div>✅ Success: <span class="success-rate">${metrics.successRate}%</span></div>
                    <div>⚡ Response: <span class="response-time">${metrics.avgResponseTime}s</span></div>
                </div>
            </div>
        `;

        document.body.appendChild(metricsDisplay);

        // Update metrics every 3 seconds
        setInterval(() => {
            metrics.activeUsers += Math.floor(Math.random() * 10) - 3;
            metrics.questionsAnswered += Math.floor(Math.random() * 5);
            metrics.successRate = (94 + Math.random() * 4).toFixed(1);
            metrics.avgResponseTime = (0.2 + Math.random() * 0.3).toFixed(1);

            document.querySelector('.active-users').textContent = metrics.activeUsers;
            document.querySelector('.questions-count').textContent = metrics.questionsAnswered;
            document.querySelector('.success-rate').textContent = metrics.successRate + '%';
            document.querySelector('.response-time').textContent = metrics.avgResponseTime + 's';
        }, 3000);
    }

    setupGlobalMap() {
        // Add dynamic country indicators
        const countries = ['USA', 'Canada', 'UK', 'Germany', 'Japan', 'Australia', 'Brazil', 'India'];
        let currentCountry = 0;

        const mapUpdates = document.querySelector('.world-map');
        if (mapUpdates) {
            const statusDiv = document.createElement('div');
            statusDiv.style.cssText = `
                text-align: center; 
                margin-top: 1rem; 
                color: white; 
                font-weight: bold;
            `;
            statusDiv.innerHTML = `🌍 Now serving students in: <span class="current-country">${countries[0]}</span>`;
            mapUpdates.appendChild(statusDiv);

            setInterval(() => {
                currentCountry = (currentCountry + 1) % countries.length;
                document.querySelector('.current-country').textContent = countries[currentCountry];
            }, 2000);
        }
    }
}

// Web Solutions dynamics
class WebSolutionsDynamics {
    constructor() {
        this.projectsCompleted = 234;
        this.clientsSatisfied = 189;
        this.init();
    }

    init() {
        this.setupProjectTracker();
        this.setupTechStackRotation();
        this.setupClientTestimonials();
        this.setupPricingCalculator();
    }

    setupProjectTracker() {
        const projects = [
            { name: "E-commerce Platform", progress: 85, client: "TechCorp" },
            { name: "Educational Portal", progress: 60, client: "LearnMore Academy" },
            { name: "Business Dashboard", progress: 95, client: "DataFlow Inc" },
            { name: "Mobile App", progress: 40, client: "StartupXYZ" }
        ];

        const tracker = document.createElement('div');
        tracker.className = 'project-tracker';
        tracker.innerHTML = `
            <div style="
                background: white; 
                padding: 2rem; 
                border-radius: 15px; 
                margin: 2rem 0; 
                box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            ">
                <h3 style="color: #1e3c72; margin-bottom: 1rem;">🚀 Active Projects</h3>
                ${projects.map(project => `
                    <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 10px;">
                        <div style="display: flex; justify-content: between; margin-bottom: 0.5rem;">
                            <strong style="color: #333;">${project.name}</strong>
                            <span style="color: #666; font-size: 0.9rem;">for ${project.client}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span>Progress</span>
                            <span style="color: #1e3c72; font-weight: bold;">${project.progress}%</span>
                        </div>
                        <div style="background: #e9ecef; height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="
                                background: linear-gradient(135deg, #1e3c72, #2a5298); 
                                height: 100%; 
                                width: ${project.progress}%; 
                                transition: width 0.5s ease;
                            "></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        const container = document.querySelector('.container');
        if (container) {
            container.appendChild(tracker);
        }

        // Update project progress every 10 seconds
        setInterval(() => {
            projects.forEach((project, index) => {
                if (project.progress < 100 && Math.random() < 0.5) {
                    project.progress = Math.min(100, project.progress + Math.floor(Math.random() * 3));
                }
            });
            this.updateProjectDisplay();
        }, 10000);
    }

    updateProjectDisplay() {
        // This would update the project tracker display
        console.log('Projects updated');
    }

    setupTechStackRotation() {
        const techStacks = [
            ['React', 'Node.js', 'MongoDB', 'AWS'],
            ['Vue.js', 'Python', 'PostgreSQL', 'Docker'],
            ['Angular', 'Express', 'MySQL', 'Azure'],
            ['Next.js', 'TypeScript', 'Prisma', 'Vercel']
        ];

        let currentStack = 0;
        const stackDisplay = document.querySelector('.rotating-tech-stack');
        
        if (stackDisplay) {
            setInterval(() => {
                const stack = techStacks[currentStack];
                stackDisplay.innerHTML = stack.map(tech => 
                    `<span class="tech-tag">${tech}</span>`
                ).join(' ');
                currentStack = (currentStack + 1) % techStacks.length;
            }, 5000);
        }
    }

    setupClientTestimonials() {
        const testimonials = [
            {
                text: "Outstanding work! They delivered our e-commerce platform ahead of schedule.",
                client: "Sarah Johnson, CEO of FashionForward",
                rating: 5
            },
            {
                text: "Professional team with excellent communication throughout the project.",
                client: "Mark Davis, CTO of TechStartup",
                rating: 5
            },
            {
                text: "The web application exceeded our expectations. Highly recommended!",
                client: "Lisa Chen, Director at EduTech",
                rating: 5
            }
        ];

        let currentTestimonial = 0;
        const testimonialElement = document.querySelector('.rotating-testimonial');
        
        if (testimonialElement) {
            setInterval(() => {
                const testimonial = testimonials[currentTestimonial];
                testimonialElement.innerHTML = `
                    <div style="text-align: center; padding: 2rem; background: white; border-radius: 15px; margin: 2rem 0;">
                        <div style="color: #f39c12; font-size: 1.2rem; margin-bottom: 1rem;">
                            ${'★'.repeat(testimonial.rating)}
                        </div>
                        <blockquote style="font-style: italic; margin-bottom: 1rem; color: #333;">
                            "${testimonial.text}"
                        </blockquote>
                        <footer style="color: #666; font-size: 0.9rem;">
                            ${testimonial.client}
                        </footer>
                    </div>
                `;
                currentTestimonial = (currentTestimonial + 1) % testimonials.length;
            }, 8000);
        }
    }

    setupPricingCalculator() {
        // Interactive pricing calculator
        const calculator = document.createElement('div');
        calculator.className = 'pricing-calculator';
        calculator.innerHTML = `
            <div style="
                background: #f8f9fa; 
                padding: 2rem; 
                border-radius: 15px; 
                margin: 2rem 0;
                border: 2px solid #1e3c72;
            ">
                <h3 style="color: #1e3c72; margin-bottom: 1rem;">💰 Quick Price Estimate</h3>
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Project Type:</label>
                    <select id="projectType" style="width: 100%; padding: 0.5rem; border-radius: 5px; border: 1px solid #ddd;">
                        <option value="website">Basic Website</option>
                        <option value="ecommerce">E-commerce Store</option>
                        <option value="webapp">Web Application</option>
                        <option value="mobile">Mobile App</option>
                    </select>
                </div>
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Timeline:</label>
                    <select id="timeline" style="width: 100%; padding: 0.5rem; border-radius: 5px; border: 1px solid #ddd;">
                        <option value="standard">Standard (2-3 months)</option>
                        <option value="rush">Rush (1 month)</option>
                        <option value="extended">Extended (4+ months)</option>
                    </select>
                </div>
                <div style="
                    background: white; 
                    padding: 1rem; 
                    border-radius: 10px; 
                    text-align: center; 
                    border: 2px solid #1e3c72;
                ">
                    <strong style="color: #1e3c72; font-size: 1.2rem;">
                        Estimated Price: $<span id="estimatedPrice">2,999</span>
                    </strong>
                </div>
            </div>
        `;

        const container = document.querySelector('.container');
        if (container) {
            container.appendChild(calculator);
        }

        // Add calculator functionality
        document.getElementById('projectType')?.addEventListener('change', this.calculatePrice);
        document.getElementById('timeline')?.addEventListener('change', this.calculatePrice);
    }

    calculatePrice() {
        const projectType = document.getElementById('projectType')?.value;
        const timeline = document.getElementById('timeline')?.value;
        
        const basePrices = {
            'website': 2999,
            'ecommerce': 4999,
            'webapp': 8999,
            'mobile': 7999
        };

        const timelineMultipliers = {
            'standard': 1.0,
            'rush': 1.5,
            'extended': 0.9
        };

        const basePrice = basePrices[projectType] || 2999;
        const multiplier = timelineMultipliers[timeline] || 1.0;
        const finalPrice = Math.round(basePrice * multiplier);

        const priceElement = document.getElementById('estimatedPrice');
        if (priceElement) {
            priceElement.textContent = finalPrice.toLocaleString();
        }
    }
}

// Initialize all dynamics when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize based on current page
    const currentPage = window.location.pathname;
    
    // Always initialize main FEFE dynamics
    new FEFEDynamics();
    
    // Initialize page-specific dynamics
    if (currentPage.includes('fefewear.html')) {
        new FEFEWearDynamics();
    } else if (currentPage.includes('ngoma.html')) {
        new NgomaDynamics();
    } else if (currentPage.includes('ai-education.html')) {
        new AIEducationDynamics();
    } else if (currentPage.includes('web-development.html')) {
        new WebSolutionsDynamics();
    }
    
    console.log('🚀 FEFE Dynamics initialized successfully!');
});

// Export for global access
window.FEFEDynamics = FEFEDynamics;
window.FEFEWearDynamics = FEFEWearDynamics;
window.NgomaDynamics = NgomaDynamics;
window.AIEducationDynamics = AIEducationDynamics;
window.WebSolutionsDynamics = WebSolutionsDynamics;
