import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '../utils/api';

export interface Dataset {
  id: number;
  filename: string;
  row_count: number | null;
  col_count: number | null;
  status: string;
  file_path: string | null;
  uploaded_at: string;
}

export interface AnalyticsData {
  id: number;
  dataset_id: number;
  summary_statistics: Record<string, any> | null;
  correlation_matrix: Record<string, any> | null;
  outliers_detected: Record<string, any> | null;
  category_analysis: Record<string, any> | null;
  trend_analysis: Record<string, any> | null;
  created_at: string;
}

export interface SchemaField {
  name: string;
  type: 'numeric' | 'categorical';
}

export interface SummaryReportData {
  dataset_name: string;
  rows: number;
  columns: number;
  uploaded_at: string;
  summary_statistics: Record<string, any>;
  outliers_detected: Record<string, any>;
  category_analysis: Record<string, any>;
  trend_analysis: Record<string, any>;
  insights: { title: string; description: string; type: string }[];
}

interface DatasetState {
  datasets: Dataset[];
  currentDataset: Dataset | null;
  analytics: AnalyticsData | null;
  schema: SchemaField[] | null;
  activeColumnName: string | null;
  activeColumnValues: any[] | null;
  loading: boolean;
  uploading: boolean;
  columnLoading: boolean;
  error: string | null;
  filterColumn: string | null;
  filterValue: string | null;
  insights: { title: string; description: string; type: string }[] | null;
  summaryReport: SummaryReportData | null;
}

const initialState: DatasetState = {
  datasets: [],
  currentDataset: null,
  analytics: null,
  schema: null,
  activeColumnName: null,
  activeColumnValues: null,
  loading: false,
  uploading: false,
  columnLoading: false,
  error: null,
  filterColumn: null,
  filterValue: null,
  insights: null,
  summaryReport: null,
};


export const fetchDatasets = createAsyncThunk(
  'datasets/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/datasets');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch datasets.');
    }
  }
);

export const uploadDatasetFile = createAsyncThunk(
  'datasets/upload',
  async (file: File, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/datasets/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'File upload and processing failed.');
    }
  }
);

export const importDatabaseDataset = createAsyncThunk(
  'datasets/importDb',
  async (dbDetails: any, { rejectWithValue }) => {
    try {
      const response = await api.post('/datasets/import-db', dbDetails);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Database import and processing failed.');
    }
  }
);


export const deleteDatasetFile = createAsyncThunk(
  'datasets/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await api.delete(`/datasets/${id}`);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to delete dataset.');
    }
  }
);

export const fetchDatasetAnalytics = createAsyncThunk(
  'datasets/fetchAnalytics',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/analytics/${id}`);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch dataset analytics.');
    }
  }
);

export const fetchDatasetSchema = createAsyncThunk(
  'datasets/fetchSchema',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/datasets/${id}/schema`);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch dataset schema.');
    }
  }
);

export const fetchColumnData = createAsyncThunk(
  'datasets/fetchColumnData',
  async ({ datasetId, columnName }: { datasetId: number; columnName: string }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/datasets/${datasetId}/column/${columnName}`);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch column data.');
    }
  }
);

export const fetchFilteredAnalytics = createAsyncThunk(
  'datasets/fetchFilteredAnalytics',
  async ({ datasetId, filterColumn, filterValue }: { datasetId: number; filterColumn: string; filterValue: string }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/analytics/${datasetId}/filter`, {
        filter_column: filterColumn,
        filter_value: filterValue
      });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to filter analytics.');
    }
  }
);

export const fetchDatasetSummaryReport = createAsyncThunk(
  'datasets/fetchSummaryReport',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/reports/summary/${id}`);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch summary report.');
    }
  }
);


const datasetSlice = createSlice({
  name: 'datasets',
  initialState,
  reducers: {
    setCurrentDataset: (state, action: PayloadAction<Dataset | null>) => {
      state.currentDataset = action.payload;
      if (!action.payload) {
        state.analytics = null;
        state.schema = null;
        state.activeColumnName = null;
        state.activeColumnValues = null;
        state.filterColumn = null;
        state.filterValue = null;
        state.insights = null;
        state.summaryReport = null;
      }
    },
    clearDatasetError: (state) => {
      state.error = null;
    },
    setActiveColumnName: (state, action: PayloadAction<string | null>) => {
      state.activeColumnName = action.payload;
    },
    setFilters: (state, action: PayloadAction<{ column: string | null; value: string | null }>) => {
      state.filterColumn = action.payload.column;
      state.filterValue = action.payload.value;
    },
    clearFilters: (state) => {
      state.filterColumn = null;
      state.filterValue = null;
    }
  },

  extraReducers: (builder) => {
    builder
      // Fetch datasets
      .addCase(fetchDatasets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDatasets.fulfilled, (state, action: PayloadAction<Dataset[]>) => {
        state.loading = false;
        state.datasets = action.payload;
      })
      .addCase(fetchDatasets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Upload dataset
      .addCase(uploadDatasetFile.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(uploadDatasetFile.fulfilled, (state, action: PayloadAction<Dataset>) => {
        state.uploading = false;
        state.datasets.unshift(action.payload);
      })
      .addCase(uploadDatasetFile.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload as string;
      })
      // Import database dataset
      .addCase(importDatabaseDataset.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(importDatabaseDataset.fulfilled, (state, action: PayloadAction<Dataset>) => {
        state.uploading = false;
        state.datasets.unshift(action.payload);
      })
      .addCase(importDatabaseDataset.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload as string;
      })

      // Delete dataset
      .addCase(deleteDatasetFile.fulfilled, (state, action: PayloadAction<number>) => {
        state.datasets = state.datasets.filter(d => d.id !== action.payload);
        if (state.currentDataset?.id === action.payload) {
          state.currentDataset = null;
          state.analytics = null;
          state.schema = null;
          state.activeColumnName = null;
          state.activeColumnValues = null;
          state.filterColumn = null;
          state.filterValue = null;
          state.insights = null;
          state.summaryReport = null;
        }
      })

      // Fetch analytics
      .addCase(fetchDatasetAnalytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDatasetAnalytics.fulfilled, (state, action: PayloadAction<AnalyticsData>) => {
        state.loading = false;
        state.analytics = action.payload;
      })
      .addCase(fetchDatasetAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch schema
      .addCase(fetchDatasetSchema.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDatasetSchema.fulfilled, (state, action: PayloadAction<SchemaField[]>) => {
        state.loading = false;
        state.schema = action.payload;
      })
      .addCase(fetchDatasetSchema.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch column data
      .addCase(fetchColumnData.pending, (state) => {
        state.columnLoading = true;
        state.error = null;
      })
      .addCase(fetchColumnData.fulfilled, (state, action: PayloadAction<{ column: string; values: any[] }>) => {
        state.columnLoading = false;
        state.activeColumnValues = action.payload.values;
        state.activeColumnName = action.payload.column;
      })
      .addCase(fetchColumnData.rejected, (state, action) => {
        state.columnLoading = false;
        state.error = action.payload as string;
      })
      // Fetch filtered analytics
      .addCase(fetchFilteredAnalytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFilteredAnalytics.fulfilled, (state, action: PayloadAction<AnalyticsData>) => {
        state.loading = false;
        state.analytics = action.payload;
      })
      .addCase(fetchFilteredAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch summary report
      .addCase(fetchDatasetSummaryReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDatasetSummaryReport.fulfilled, (state, action: PayloadAction<SummaryReportData>) => {
        state.loading = false;
        state.summaryReport = action.payload;
        state.insights = action.payload.insights;
      })
      .addCase(fetchDatasetSummaryReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

  },
});

export const { setCurrentDataset, clearDatasetError, setActiveColumnName, setFilters, clearFilters } = datasetSlice.actions;
export default datasetSlice.reducer;
