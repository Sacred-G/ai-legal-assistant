# AI Legal Assistant

## Setup Instructions

### Prerequisites
- Node.js v16 or higher
- A Supabase account and project
- An OpenAI API key

### Environment Variables
1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Fill in the environment variables in `.env`:
- `PORT`: Server port (default: 4006)
- `OPENAI_API_KEY`: Your OpenAI API key
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase project's anon/public key

### Supabase Setup
1. Create a new Supabase project at https://supabase.com
2. In your Supabase project's SQL editor, run the SQL commands from `supabase/tables.sql` to:
   - Create the medical_inputs table
   - Create the calculation_results table
   - Create the calculate_pd_ratings function
   - Set up the trigger for automatic calculations

### Installation
1. Install server dependencies:
```bash
npm install
```

2. Install client dependencies:
```bash
cd client
npm install
```

### Running the Application
1. Start the server:
```bash
npm start
```

2. In a new terminal, start the client:
```bash
cd client
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:4006

## Features

### Rate Report Analysis
The application can analyze medical reports to:
1. Extract key information like:
   - Patient name
   - Age
   - Date of injury
   - Body parts and their WPI ratings
2. Store the extracted data in Supabase
3. Automatically calculate:
   - PD ratings with and without apportionment
   - Financial details including weekly rates and total payouts
4. Display results in a structured format showing:
   - No apportionment sections
   - With apportionment sections
   - Financial details
   - Calculation details

## Architecture

### Backend Services
- `pdfService.js`: Handles PDF text extraction
- `reportExtractionService.js`: Uses OpenAI to extract structured data
- `supabaseService.js`: Manages database operations

### Database Structure
- `medical_inputs`: Stores extracted report data
- `calculation_results`: Stores calculated ratings and financial details
- Automatic trigger for calculations on new medical inputs

### Frontend Components
- `RateReports.jsx`: Main interface for report analysis
  - File upload
  - Form inputs
  - Results display

## Error Handling
The application includes error handling for:
- Invalid file types
- File size limits
- PDF processing errors
- Data extraction failures
- Database operation failures

## Security
- Environment variables for sensitive credentials
- CORS configuration for allowed origins
- File size and type validation
- Input sanitization
I've made all the necessary improvements to help with the mapping process:

UI/UX Improvements:
Changed group number to readonly input
Added group numbers to occupation dropdown options
Sorted occupations alphabetically
Improved impairment display with code and label
Added detailed logging
Data Mapping:
Added helper function to extract impairment codes
Added automatic age calculation from DOB and DOI
Updated Supabase service to include all required fields
Added error handling for occupation loading
Added detailed logging for data mapping
Form Validation:
Added error handling for occupation loading
Added validation for required fields before submission
Added error messages for missing data
The code is now ready to:

Extract impairment codes from labels
Map occupations to group numbers
Calculate age automatically
Send all required data to Supabase
Handle the results properly
Let me use attempt_completion to present the result.


Task Completed
I have successfully implemented the mapping functionality for the PDR calculator:

Occupation Mapping:
Occupations are loaded and sorted alphabetically
Each occupation shows its group number in the dropdown
Group number is automatically updated and displayed in a readonly field
Added error handling for occupation loading
Impairment Mapping:
Added helper function to extract impairment codes from labels
Impairments show both code and full label in the table
Added detailed logging for impairment data
Age Calculation:
Added automatic age calculation from DOB and DOI
Added error handling for date parsing
Data Integration:
Updated Supabase service to include all required fields
Added proper error handling and validation
Added detailed logging for debugging