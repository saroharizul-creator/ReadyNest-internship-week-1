# Data Analytics & Reporting Platform

An end-to-end, production-hardened web application designed to upload, clean, profile, and visualize business datasets. Built with a modern **React/TypeScript** frontend and a high-performance **FastAPI** backend, the platform empowers users to turn raw spreadsheet data into interactive dashboards and print-ready executive reports.

## Key Features

*   **Automated Data Cleaning Pipeline**: Upload CSV, XLS, or XLSX files (up to 100MB) to automatically remove duplicates, impute missing values, standardize datetimes, and detect outliers (IQR).
*   **Multi-Source Database Importer**: Query and import tables directly from SQLite, MySQL, and PostgreSQL databases via connection URIs or credentials.
*   **Interactive Profiling & Analytics**: Renders descriptive statistics, correlation heatmaps, distribution histograms, scatter plots, and box plots.
*   **Dynamic Filtering**: Filter datasets on-the-fly by specific column values to instantly recalculate all statistical profiles.
*   **Custom Dashboard Builder**: Save and customize layouts of charts and metrics linked to your user account.
*   **Executive Export & Reporting**: Export cleaned datasets to CSV/Excel, and generate styled PDF Data Quality & Audit Reports with automated business insights.
*   **Security & Auditing**: Secured with JWT token-based authentication, role-based access control (Admin, Manager, User), and comprehensive database audit logs.

## System Architecture

```text
  +----------------------------------------------------------+
  ¦                        FRONTEND                          ¦
  ¦  React 19  ¦  TypeScript  ¦  Redux Toolkit  ¦  Chart.js  ¦
  +----------------------------------------------------------+
                               ¦ HTTP API Calls (Axios)
                               ?
  +----------------------------------------------------------+
  ¦                        BACKEND                           ¦
  ¦    FastAPI  ¦  Pandas / NumPy  ¦  SQLAlchemy ORM         ¦
  +----------------------------------------------------------+
                               ¦ SQL Queries
                               ?
  +----------------------------------------------------------+
  ¦                       DATABASES                          ¦
  ¦   SQLite (Local Metadata)  ¦  External DBs (Import Source)¦
  +----------------------------------------------------------+
```

## Setup & Installation

### Prerequisites
*   Python 3.10+
*   Node.js 18+ & npm

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and configure your environment variables:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the Uvicorn dev server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   The backend API will run on [http://127.0.0.1:8000](http://127.0.0.1:8000) and documentation is available at `/docs`.

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```
   The frontend application will open on [http://localhost:5173/](http://localhost:5173/).

## Environment Variables (Backend)

Create a `backend/.env` file with the following variables:
*   `HOST`: The host address the server binds to (default: `127.0.0.1`).
*   `PORT`: The port the server listens on (default: `8000`).
*   `DEBUG`: Enables reload and verbose logging when set to `True`.
*   `DATABASE_URL`: Connection string for metadata database (SQLite/MySQL/PostgreSQL).
*   `SECRET_KEY`: JWT signing secret key.
*   `ALGORITHM`: JWT signature algorithm (default: `HS256`).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
