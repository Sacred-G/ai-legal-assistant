import streamlit as st
from ui.components import (
    setup_page,
    render_header,
    render_upload_section,
    render_display_mode_selector,
    render_impairments_card,
    render_combinations_card,
    render_final_calculations_card,
    render_detailed_summary_card
)
from processing.rating_calculator import calculate_rating
from report.report_processor import process_report
from ui.auth import check_authentication, login_form, logout

def main():
    """Main application entry point."""
    setup_page()
    
    # Initialize session state
    if "show_login" not in st.session_state:
        st.session_state.show_login = False
    
    # Handle authentication flow
    if not check_authentication():
        if st.session_state.show_login:
            success, error = login_form()
            if error:
                st.error(error)
            elif success:
                st.rerun()
        else:
            st.title("Workers' Compensation Rating Calculator")
            st.write("""
            Welcome to the Workers' Compensation Rating Calculator. 
            Please log in to access the rating tools.
            """)
            if st.button("Login"):
                st.session_state.show_login = True
                st.rerun()
        return
    
    # Add logout button to sidebar
    if st.sidebar.button("Logout"):
        logout()
        st.rerun()
    
    # Main application content
    st.title("Workers' Compensation Rating Calculator")
    st.write("""
    Upload a medical report to calculate permanent disability ratings. 
    The system will analyze the report and provide detailed calculations.
    """)
    
    # Upload section
    mode, uploaded_file, manual_data = render_upload_section()
    
    if uploaded_file:
        with st.spinner("Processing report..."):
            # Process the report
            report_data = process_report(uploaded_file)
            
            # Calculate rating
            rating_result = calculate_rating(
                report_data,
                age=manual_data.get("age"),
                occupation=manual_data.get("occupation")
            )
            
            # Display mode selection
            display_mode = render_display_mode_selector()
            
            # Display results
            if display_mode == "Standard":
                st.subheader("Rating Results")
                st.write(f"Final PD Rating: {rating_result['final_pd_percent']}%")
                st.write(f"Total Weeks: {rating_result['weeks']}")
                st.write(f"Total PD Amount: ${rating_result['total_pd_dollars']:.2f}")
            else:
                st.markdown(render_impairments_card(rating_result['impairments']), 
                          unsafe_allow_html=True)
                st.markdown(render_combinations_card(
                    rating_result['upper_extremities'],
                    rating_result['lower_extremities'],
                    rating_result['spine'],
                    rating_result['other'],
                    rating_result
                ), unsafe_allow_html=True)
                st.markdown(render_final_calculations_card(rating_result), 
                          unsafe_allow_html=True)
                
                if mode == "Detailed Summary" and 'detailed_summary' in rating_result:
                    st.markdown(render_detailed_summary_card(rating_result['detailed_summary']),
                              unsafe_allow_html=True)

if __name__ == "__main__":
    main()
