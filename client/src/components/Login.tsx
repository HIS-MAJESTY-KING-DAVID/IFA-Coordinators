import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock } from 'lucide-react';
import { API_BASE_URL } from '../utils/config';

interface LoginProps {
    onLogin: (success: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const resp = await axios.post(`${API_BASE_URL}/api/login`, { password });
            if (resp.data.success) {
                onLogin(true);
                navigate('/admin');
            }
        } catch (err) {
            console.error('Login failed', err);
            setError('Invalid password. Access denied.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-20 p-8 bg-ifa-card rounded-xl border border-gray-800 shadow-2xl">
            <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-ifa-gold/10 rounded-full flex items-center justify-center mb-4">
                    <Lock className="text-ifa-gold" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-ifa-gold">Admin Access</h2>
                <p className="text-gray-400 text-sm mt-2">Enter your password to manage the board</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-ifa-dark border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-ifa-gold focus:border-transparent outline-none transition-all"
                        placeholder="••••••••"
                        required
                    />
                </div>

                {error && (
                    <p className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-ifa-gold hover:bg-ifa-gold/90 text-ifa-dark font-bold py-3 rounded-lg transition-all transform active:scale-[0.98] disabled:opacity-50"
                >
                    {loading ? 'Authenticating...' : 'Unlock Dashboard'}
                </button>
            </form>
        </div>
    );
};

export default Login;
