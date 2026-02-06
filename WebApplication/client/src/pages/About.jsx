import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

// Animated counter component
function AnimatedCounter({ value, duration = 2000, suffix = "" }) {
    const [count, setCount] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.1 }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        let startTime;
        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            setCount(Math.floor(progress * value));
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }, [isVisible, value, duration]);

    return <span ref={ref}>{count}{suffix}</span>;
}

// Feature card with animation
function FeatureCard({ icon, title, description, delay }) {
    return (
        <div
            className="glass card-border rounded-3xl p-6 transform transition-all duration-500 hover:scale-105 hover:shadow-xl hover:shadow-accent/10"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-emerald-500/20 flex items-center justify-center mb-4">
                {icon}
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
        </div>
    );
}

// Step component for tutorial
function TutorialStep({ number, title, description, isActive, onClick }) {
    return (
        <div
            onClick={onClick}
            className={`cursor-pointer p-5 rounded-2xl border transition-all duration-300 ${isActive
                    ? 'border-accent bg-accent/10 shadow-lg shadow-accent/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                }`}
        >
            <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 transition-colors ${isActive ? 'bg-accent text-slate-900' : 'bg-white/10 text-white'
                    }`}>
                    {number}
                </div>
                <div>
                    <h4 className={`font-semibold mb-1 transition-colors ${isActive ? 'text-accent' : 'text-white'}`}>
                        {title}
                    </h4>
                    <p className="text-slate-400 text-sm">{description}</p>
                </div>
            </div>
        </div>
    );
}

export default function About() {
    const [activeStep, setActiveStep] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setIsLoaded(true);

        // Auto-advance tutorial steps
        const interval = setInterval(() => {
            setActiveStep((prev) => (prev + 1) % 5);
        }, 4000);

        return () => clearInterval(interval);
    }, []);

    const tutorialSteps = [
        {
            title: "Create Your Account",
            description: "Sign up for free to access all features. Your data is secure and encrypted.",
            visual: (
                <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-emerald-500 flex items-center justify-center animate-pulse">
                        <svg className="w-10 h-10 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <div className="text-center">
                        <div className="text-white font-medium">Quick Sign Up</div>
                        <div className="text-slate-400 text-sm">Takes less than 30 seconds</div>
                    </div>
                </div>
            )
        },
        {
            title: "Select a Cryptocurrency",
            description: "Browse our dashboard to find Bitcoin, Ethereum, and other major cryptocurrencies.",
            visual: (
                <div className="flex gap-3 justify-center flex-wrap">
                    {['BTC', 'ETH', 'BNB', 'SOL'].map((coin, i) => (
                        <div
                            key={coin}
                            className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-white font-medium animate-bounce"
                            style={{ animationDelay: `${i * 100}ms` }}
                        >
                            {coin}
                        </div>
                    ))}
                </div>
            )
        },
        {
            title: "Analyze Historical Data",
            description: "View detailed price charts, trends, and technical indicators for any time range.",
            visual: (
                <div className="relative h-32 w-full max-w-xs mx-auto">
                    <svg className="w-full h-full" viewBox="0 0 200 80">
                        <defs>
                            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#14f195" stopOpacity="0.5" />
                                <stop offset="100%" stopColor="#14f195" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M0,60 Q40,50 60,40 T100,35 T140,20 T180,30 L200,25"
                            fill="none"
                            stroke="#14f195"
                            strokeWidth="2"
                            className="animate-pulse"
                        />
                        <path
                            d="M0,60 Q40,50 60,40 T100,35 T140,20 T180,30 L200,25 L200,80 L0,80 Z"
                            fill="url(#lineGradient)"
                        />
                    </svg>
                </div>
            )
        },
        {
            title: "View ML Predictions",
            description: "Our LSTM models analyze patterns and predict future prices with high accuracy.",
            visual: (
                <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-accent animate-pulse">94.2%</div>
                        <div className="text-slate-400 text-sm">Accuracy Rate</div>
                    </div>
                    <div className="w-px h-12 bg-white/20"></div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-emerald-400 animate-pulse">30 Days</div>
                        <div className="text-slate-400 text-sm">Forecast Range</div>
                    </div>
                </div>
            )
        },
        {
            title: "Track Your History",
            description: "All your forecasts are saved. Compare predictions with actual prices over time.",
            visual: (
                <div className="flex flex-col gap-2">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 animate-slideIn"
                            style={{ animationDelay: `${i * 150}ms` }}
                        >
                            <div className={`w-3 h-3 rounded-full ${i === 1 ? 'bg-emerald-400' : i === 2 ? 'bg-accent' : 'bg-blue-400'}`}></div>
                            <div className="text-sm text-white">Prediction #{i}</div>
                            <div className="ml-auto text-xs text-emerald-400">+{(Math.random() * 5).toFixed(2)}%</div>
                        </div>
                    ))}
                </div>
            )
        }
    ];

    return (
        <main className="min-h-screen">
            {/* Hero Section */}
            <section className="relative overflow-hidden py-20 px-4">
                {/* Animated background */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>

                <div className={`relative max-w-4xl mx-auto text-center transform transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent mb-6">
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                        About Crypto Pulse
                    </div>

                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                        AI-Powered
                        <span className="block bg-gradient-to-r from-accent via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                            Crypto Forecasting
                        </span>
                    </h1>

                    <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
                        Crypto Pulse uses advanced LSTM neural networks to analyze cryptocurrency patterns
                        and provide accurate price predictions, helping you make informed trading decisions.
                    </p>

                    <div className="flex justify-center gap-4">
                        <Link
                            to="/signup"
                            className="rounded-full bg-gradient-to-r from-accent to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all duration-300 transform hover:scale-105"
                        >
                            Get Started Free
                        </Link>
                        <Link
                            to="/dashboard"
                            className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:border-white/40 hover:bg-white/5 transition-all duration-300"
                        >
                            View Dashboard
                        </Link>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-16 px-4 border-y border-white/5">
                <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="text-center">
                        <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                            <AnimatedCounter value={8} suffix="+" />
                        </div>
                        <div className="text-slate-400 text-sm">Cryptocurrencies</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                            <AnimatedCounter value={94} suffix="%" />
                        </div>
                        <div className="text-slate-400 text-sm">Prediction Accuracy</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                            <AnimatedCounter value={30} suffix=" Days" />
                        </div>
                        <div className="text-slate-400 text-sm">Forecast Range</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                            <AnimatedCounter value={24} suffix="/7" />
                        </div>
                        <div className="text-slate-400 text-sm">Live Data</div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Why Choose Crypto Pulse?</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">
                            Our platform combines cutting-edge machine learning with real-time data to deliver
                            accurate cryptocurrency predictions.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FeatureCard
                            delay={0}
                            icon={
                                <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            }
                            title="LSTM Neural Networks"
                            description="Advanced deep learning models trained on years of historical data to recognize complex patterns and trends."
                        />
                        <FeatureCard
                            delay={100}
                            icon={
                                <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            }
                            title="Real-Time Data"
                            description="Live price feeds from Binance ensure you always have the most up-to-date information."
                        />
                        <FeatureCard
                            delay={200}
                            icon={
                                <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            }
                            title="Technical Indicators"
                            description="RSI, MACD, Bollinger Bands, and moving averages help you understand market sentiment."
                        />
                        <FeatureCard
                            delay={300}
                            icon={
                                <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            }
                            title="Multiple Horizons"
                            description="Get predictions for 1, 2, 7, 15, or 30 days ahead to match your trading strategy."
                        />
                        <FeatureCard
                            delay={400}
                            icon={
                                <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            }
                            title="Secure & Private"
                            description="Your data is encrypted and never shared. We take your privacy seriously."
                        />
                        <FeatureCard
                            delay={500}
                            icon={
                                <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                                </svg>
                            }
                            title="Beautiful Dashboard"
                            description="Intuitive interface with TradingView charts, custom visualizations, and dark mode."
                        />
                    </div>
                </div>
            </section>

            {/* Tutorial Section */}
            <section className="py-20 px-4 bg-gradient-to-b from-transparent via-accent/5 to-transparent">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How It Works</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">
                            Get started with Crypto Pulse in just a few simple steps. Our platform is designed
                            to be intuitive and easy to use.
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8 items-center">
                        {/* Steps */}
                        <div className="space-y-4">
                            {tutorialSteps.map((step, index) => (
                                <TutorialStep
                                    key={index}
                                    number={index + 1}
                                    title={step.title}
                                    description={step.description}
                                    isActive={activeStep === index}
                                    onClick={() => setActiveStep(index)}
                                />
                            ))}
                        </div>

                        {/* Visual */}
                        <div className="glass card-border rounded-3xl p-8 h-[400px] flex items-center justify-center">
                            <div className="w-full max-w-sm">
                                {tutorialSteps[activeStep].visual}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Technology Section */}
            <section className="py-20 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Powered By</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">
                            Built with modern technologies for reliability, speed, and accuracy.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { name: "TensorFlow", desc: "Deep Learning" },
                            { name: "Python", desc: "Backend" },
                            { name: "React", desc: "Frontend" },
                            { name: "Binance API", desc: "Live Data" }
                        ].map((tech) => (
                            <div key={tech.name} className="glass card-border rounded-2xl p-6 text-center hover:scale-105 transition-transform duration-300">
                                <div className="text-lg font-semibold text-white mb-1">{tech.name}</div>
                                <div className="text-sm text-slate-400">{tech.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="glass card-border rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
                        {/* Background decoration */}
                        <div className="absolute top-0 left-0 w-full h-full">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
                        </div>

                        <div className="relative">
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                                Ready to Start Predicting?
                            </h2>
                            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
                                Join thousands of traders using AI-powered insights to make smarter decisions.
                                Start for free today!
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link
                                    to="/signup"
                                    className="rounded-full bg-gradient-to-r from-accent to-emerald-500 px-8 py-4 text-sm font-semibold text-slate-900 shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all duration-300 transform hover:scale-105"
                                >
                                    Create Free Account
                                </Link>
                                <Link
                                    to="/"
                                    className="rounded-full border border-white/20 px-8 py-4 text-sm font-semibold text-white hover:border-white/40 hover:bg-white/5 transition-all duration-300"
                                >
                                    Back to Home
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 py-8 px-4">
                <div className="max-w-6xl mx-auto text-center text-slate-500 text-sm">
                    <p>© {new Date().getFullYear()} Crypto Pulse. Built with ❤️ for crypto enthusiasts.</p>
                </div>
            </footer>
        </main>
    );
}
