import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '../utils/api';

export interface DashboardConfig {
  id: number;
  name: string;
  layout_data: Record<string, any>;
  user_id: number;
  created_at: string;
}

interface DashboardState {
  dashboards: DashboardConfig[];
  activeDashboard: DashboardConfig | null;
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  dashboards: [],
  activeDashboard: null,
  loading: false,
  error: null,
};

export const fetchDashboards = createAsyncThunk(
  'dashboards/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/dashboards');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch dashboards.');
    }
  }
);

export const createDashboard = createAsyncThunk(
  'dashboards/create',
  async (data: { name: string; layout_data: Record<string, any> }, { rejectWithValue }) => {
    try {
      const response = await api.post('/dashboards', data);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to create dashboard.');
    }
  }
);

export const deleteDashboard = createAsyncThunk(
  'dashboards/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await api.delete(`/dashboards/${id}`);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to delete dashboard.');
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboards',
  initialState,
  reducers: {
    setActiveDashboard: (state, action: PayloadAction<DashboardConfig | null>) => {
      state.activeDashboard = action.payload;
    },
    updateActiveDashboardLayout: (state, action: PayloadAction<Record<string, any>>) => {
      if (state.activeDashboard) {
        state.activeDashboard.layout_data = action.payload;
      }
    },
    clearDashboardError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch dashboards
      .addCase(fetchDashboards.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboards.fulfilled, (state, action: PayloadAction<DashboardConfig[]>) => {
        state.loading = false;
        state.dashboards = action.payload;
      })
      .addCase(fetchDashboards.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create dashboard
      .addCase(createDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDashboard.fulfilled, (state, action: PayloadAction<DashboardConfig>) => {
        state.loading = false;
        state.dashboards.push(action.payload);
        state.activeDashboard = action.payload;
      })
      .addCase(createDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete dashboard
      .addCase(deleteDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteDashboard.fulfilled, (state, action: PayloadAction<number>) => {
        state.loading = false;
        state.dashboards = state.dashboards.filter(d => d.id !== action.payload);
        if (state.activeDashboard?.id === action.payload) {
          state.activeDashboard = state.dashboards[0] || null;
        }
      })
      .addCase(deleteDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setActiveDashboard, updateActiveDashboardLayout, clearDashboardError } = dashboardSlice.actions;
export default dashboardSlice.reducer;
