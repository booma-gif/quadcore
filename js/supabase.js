// supabase.js
// Initialize Supabase Client
// We assume supabase is loaded via CDN globally

let supabaseClient = null;

const SupabaseConfig = {
  // Replace these with actual Supabase keys in production
  url: 'YOUR_SUPABASE_URL',
  key: 'YOUR_SUPABASE_ANON_KEY',
  init() {
    // Only init if supabase is defined
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(this.url, this.key);
    } else {
        console.warn("Supabase library not found. Running in offline mockup mode.");
    }
  }
};

// Abstracted DB methods so we can mock if needed
const DB = {
  async signUp(email, password, fullName, org) {
    if (!supabaseClient) return { data: { user: { id: 'test', email } }, error: null };
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          organisation: org
        }
      }
    });
    return { data, error };
  },

  async signIn(email, password) {
    if (!supabaseClient) return { data: { user: { id: 'test', email } }, error: null };
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  async signOut() {
    if (!supabaseClient) {
      localStorage.removeItem('sb_session');
      return { error: null };
    }
    const { error } = await supabaseClient.auth.signOut();
    return { error };
  },

  async getSession() {
    if (!supabaseClient) return { data: { session: { user: { email: 'demo@citysimulate.gov'} } }, error: null };
    const { data, error } = await supabaseClient.auth.getSession();
    return { data, error };
  },

  async getUser() {
      const { data } = await this.getSession();
      return data?.session?.user || null;
  },

  async requireAuth() {
     const user = await this.getUser();
     if (!user) {
         window.location.href = 'login.html';
     }
     return user;
  },

  async getCities() {
    if (!supabaseClient) {
        return { data: [
            {id: 1, name: 'London', lat: 51.505, lng: -0.09, population: 8982000, description: 'Capital of England'},
            {id: 2, name: 'New York', lat: 40.7128, lng: -74.0060, population: 8419000, description: 'NYC'},
            {id: 3, name: 'Tokyo', lat: 35.6762, lng: 139.6503, population: 13960000, description: 'Japan capital'},
            {id: 4, name: 'Mumbai', lat: 19.0760, lng: 72.8777, population: 20411000, description: 'India'},
            {id: 5, name: 'Lagos', lat: 6.5244, lng: 3.3792, population: 14800000, description: 'Nigeria'}
        ], error: null };
    }
    const { data, error } = await supabaseClient.from('cities').select('*');
    return { data, error };
  },

  async saveSimulation(simulationData) {
    if (!supabaseClient) {
        console.log("Mock saved simulation: ", simulationData);
        return { data: {id: Math.random().toString()}, error: null };
    }
    const { data, error } = await supabaseClient
      .from('simulations')
      .insert([simulationData])
      .select();
    return { data, error };
  },

  async getSimulations() {
    if (!supabaseClient) return { data: [], error: null };
    const { data, error } = await supabaseClient
      .from('simulations')
      .select(`*, cities (name)`)
      .order('created_at', { ascending: false });
    return { data, error };
  }
};

// Try to init immediately
SupabaseConfig.init();
