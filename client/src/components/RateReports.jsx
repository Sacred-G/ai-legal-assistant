import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { uploadFileToAssistants, sendAssistantMessage } from '../config/api';
import { insertCalculatorInput, getCompleteRatingResults } from '../services/pdrService';
import bodyList from '../../../data/mappingBody';
import occupationMapping from '../../../data/occupationMapping';
import codeList from '../../../data/mappingCode';
import { Container, Grid, Button, LoadingOverlay } from '@mantine/core';

// Import sub-components
import FileUploadSection from './RateReports/FileUploadSection';
import PersonalInfoSection from './RateReports/PersonalInfoSection';
import ImpairmentForm from './RateReports/ImpairmentForm';
import ImpairmentTable from './RateReports/ImpairmentTable';
import AnalysisResults from './RateReports/AnalysisResults';

const RateReports = () => {
    const { isDark } = useTheme();
    const [formData, setFormData] = useState({
        file: null,
        applicantName: '',
        caseNumber: '',
        groupNumber: '351',
        gender: 'male',
        occupation: '',
        dateOfBirth: '',
        dateOfInjury: '',
        age: '',
        weeklyEarnings: '',
        maxEarnings: false,
        evaluatorName: '',
        nonIndustrial: '',
        industrial: '',
        selectedImpairment: '',
        ag: false,
        wpi: '',
        leftRight: 'None',
        painMedication: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fileId, setFileId] = useState(null);
    const [threadId, setThreadId] = useState(null);
    const [impairments, setImpairments] = useState([]);
    const [analysis, setAnalysis] = useState(null);
    const [occupations, setOccupations] = useState([]);
    const [impairmentOptions, setImpairmentOptions] = useState([]);
    const [processingStatus, setProcessingStatus] = useState('');
    const [extractedData, setExtractedData] = useState(null);

    const handleDataExtracted = (bodyParts) => {
        const impairments = bodyParts.map(part => ({
            id: Date.now() + Math.random(),
            impairment: part.code,
            impairmentLabel: getFullImpairmentCode(part.code),
            description: part.description,
            wpi: part.wpi?.toString() || '',
            industrial: part.apportionment?.industrial?.toString() || '',
            nonIndustrial: part.apportionment?.nonIndustrial?.toString() || '',
            leftRight: part.leftRight || 'None',
            painMedication: part.painAdd || false,
            ag: part.ag || false
        }));
        setImpairments(impairments);
    };

    useEffect(() => {
        setImpairmentOptions(bodyList);
    }, []);

    useEffect(() => {
        try {
            // Filter out any invalid entries and map to the correct structure
            const parsedOccupations = occupationMapping
                .filter(item => item && typeof item === 'object' && item.occupation_title)
                .map(item => ({
                    group_number: item.group_number || '',
                    occupation_title: item.occupation_title,
                    industry: ''
                }));

            // Sort the filtered and valid occupations
            const sortedOccupations = parsedOccupations.sort((a, b) =>
                (a.occupation_title || '').localeCompare(b.occupation_title || '')
            );

            setOccupations(sortedOccupations);
        } catch (error) {
            console.error('Error loading occupations:', error);
            setError('Error loading occupations. Please try again.');
            setOccupations([]); // Set empty array on error
        }
    }, []);

    const calculateAge = (dob, doi) => {
        try {
            const dobDate = new Date(dob);
            const doiDate = new Date(doi);
            let age = doiDate.getFullYear() - dobDate.getFullYear();
            const m = doiDate.getMonth() - dobDate.getMonth();
            if (m < 0 || (m === 0 && doiDate.getDate() < dobDate.getDate())) {
                age--;
            }
            return age;
        } catch (error) {
            console.error('Error calculating age:', error);
            return '';
        }
    };

    const getFullImpairmentCode = (number) => {
        const codeItem = codeList.find(item => item.value === number);
        return codeItem ? codeItem.label : number;
    };

    const getImpairmentCode = (label) => {
        const match = label.match(/(\d+)\s*>/);
        return match ? match[1] : '';
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (name === 'occupation') {
            const selectedOccupation = occupations.find(occ => occ.occupation_title === value);
            setFormData(prev => ({
                ...prev,
                occupation: value,
                groupNumber: selectedOccupation ? selectedOccupation.group_number : '351'
            }));
        } else if (name === 'dateOfBirth' || name === 'dateOfInjury') {
            setFormData(prev => {
                const newData = {
                    ...prev,
                    [name]: value
                };
                if (newData.dateOfBirth && newData.dateOfInjury) {
                    newData.age = calculateAge(newData.dateOfBirth, newData.dateOfInjury).toString();
                }
                return newData;
            });
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
    };

    const handleAddImpairment = () => {
        const impairmentCode = getImpairmentCode(formData.selectedImpairment);
        const newImpairment = {
            id: Date.now(),
            nonIndustrial: formData.nonIndustrial,
            industrial: formData.industrial,
            impairment: impairmentCode,
            impairmentLabel: formData.selectedImpairment,
            ag: formData.ag,
            wpi: formData.wpi,
            leftRight: formData.leftRight,
            painMedication: formData.painMedication
        };

        setImpairments(prev => [...prev, newImpairment]);
        setFormData(prev => ({
            ...prev,
            nonIndustrial: '',
            industrial: '',
            selectedImpairment: '',
            ag: false,
            wpi: '',
            leftRight: 'None',
            painMedication: ''
        }));
    };

    const handleRemoveImpairment = (id) => {
        setImpairments(prev => prev.filter(imp => imp.id !== id));
    };

    const handleFileUpload = async (file) => {
        setLoading(true);
        setProcessingStatus('Uploading file...');
        try {
            const uploadFormData = new FormData();
            uploadFormData.append('file', file);

            const response = await uploadFileToAssistants(uploadFormData, 'rate');

            // Store thread and assistant IDs if returned
            if (response.threadId) setThreadId(response.threadId);
            if (response.assistantId) setFileId(response.assistantId);
            if (!response || !response.calculatorData) {
                throw new Error('No data received from server');
            }

            try {
                const { calculatorData } = response;
                const demographics = calculatorData.demographics || {};

                // Update form data with extracted information
                setFormData(prev => ({
                    ...prev,
                    applicantName: demographics.name || '',
                    dateOfInjury: demographics.dateOfInjury || '',
                    dateOfBirth: demographics.dateOfBirth || '',
                    occupation: demographics.occupation?.title || '',
                    weeklyEarnings: demographics.weeklyEarnings?.toString() || '',
                    maxEarnings: demographics.weeklyEarnings >= 1000,
                    evaluatorName: calculatorData.evaluatorName || '',
                    // Calculate age if both dates are present
                    age: demographics.dateOfBirth && demographics.dateOfInjury ?
                        calculateAge(demographics.dateOfBirth, demographics.dateOfInjury).toString() : ''
                }));

                // Process impairments if present
                if (calculatorData.impairments && calculatorData.impairments.length > 0) {
                    const newImpairments = calculatorData.impairments.map(imp => ({
                        id: Date.now() + Math.random(),
                        impairment: imp.bodyPart.code,
                        impairmentLabel: getFullImpairmentCode(imp.bodyPart.code),
                        description: imp.bodyPart.name,
                        wpi: imp.wpi?.toString() || '',
                        industrial: imp.apportionment?.industrial?.toString() || '100',
                        nonIndustrial: imp.apportionment?.nonIndustrial?.toString() || '0',
                        leftRight: imp.bodyPart.name.toLowerCase().includes('bilateral') ? 'Bilateral' :
                            imp.bodyPart.name.toLowerCase().includes('right') ? 'Right' :
                                imp.bodyPart.name.toLowerCase().includes('left') ? 'Left' : 'None',
                        painMedication: imp.adjustments?.pain?.add || false,
                        ag: imp.adjustments?.adl?.impacted || false
                    }));
                    setImpairments(newImpairments);
                }

                // Update occupation group if occupation is found
                if (demographics.occupation?.title) {
                    const matchedOccupation = occupations.find(occ =>
                        occ.occupation_title.toLowerCase() === demographics.occupation.title.toLowerCase()
                    );
                    if (matchedOccupation) {
                        setFormData(prev => ({
                            ...prev,
                            groupNumber: matchedOccupation.group_number || '351'
                        }));
                    }
                }
            } catch (parseError) {
                console.error('Error parsing response:', parseError);
                throw new Error('Failed to parse data from the medical report');
            }

            setProcessingStatus('File processed successfully');
        } catch (error) {
            console.error('Error processing file:', error);
            setError('Error processing file. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!formData.occupation) {
            setError('Please enter an occupation');
            return;
        }

        if (!formData.age) {
            setError('Please enter an age');
            return;
        }

        if (impairments.length === 0) {
            setError('Please add at least one impairment');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const inputData = {
                demographics: {
                    dateOfBirth: formData.dateOfBirth,
                    dateOfInjury: formData.dateOfInjury,
                    occupation: { title: formData.occupation },
                    weeklyEarnings: parseFloat(formData.weeklyEarnings) || 0
                },
                impairments: impairments.map(imp => ({
                    bodyPart: {
                        code: imp.impairment,
                        name: imp.impairmentLabel,
                        section: 'General',
                        type: 'Standard'
                    },
                    wpi: parseFloat(imp.wpi),
                    adjustments: {
                        pain: { add: imp.painMedication },
                        adl: { impacted: imp.ag }
                    },
                    apportionment: {
                        industrial: parseFloat(imp.industrial) || 100,
                        nonIndustrial: parseFloat(imp.nonIndustrial) || 0
                    },
                    futureMedial: false
                }))
            };

            // Calculate ratings directly
            const result = await insertCalculatorInput(inputData);
            setAnalysis(result);
            setLoading(false);

        } catch (error) {
            console.error('Error calculating ratings:', {
                error: error.message,
                status: error.response?.status,
                data: error.response?.data,
                inputData: {
                    hasName: !!inputData.name,
                    hasAge: !!inputData.age,
                    hasOccupation: !!inputData.occupation,
                    impairmentCount: Object.keys(inputData.bodyParts).length
                }
            });
            setError(error.response?.data?.error || error.message || 'Error calculating ratings');
            setLoading(false);
        }
    };

    return (
        <Container size="xl" className={isDark ? 'text-gray-200' : 'text-gray-800'}>
            <div style={{ position: 'relative' }}>
                <LoadingOverlay visible={loading} blur={2} />
                {processingStatus && (
                    <div className="mt-2 text-blue-500 text-center font-medium">
                        {processingStatus}
                    </div>
                )}

                <Grid gutter="md">
                    <Grid.Col span={6}>
                        <FileUploadSection
                            formData={formData}
                            loading={loading}
                            error={error}
                            handleInputChange={handleInputChange}
                            handleFileUpload={handleFileUpload}
                            occupations={occupations}
                            extractedData={extractedData}
                            onDataExtracted={handleDataExtracted}
                        />
                    </Grid.Col>

                    <Grid.Col span={6}>
                        <PersonalInfoSection
                            formData={formData}
                            handleInputChange={handleInputChange}
                        />
                    </Grid.Col>
                </Grid>

                <ImpairmentForm
                    formData={formData}
                    handleInputChange={handleInputChange}
                    handleAddImpairment={handleAddImpairment}
                    impairmentOptions={impairmentOptions}
                />

                <ImpairmentTable
                    impairments={impairments}
                    handleRemoveImpairment={handleRemoveImpairment}
                    getFullImpairmentCode={getFullImpairmentCode}
                />

                <div className="mt-6 flex justify-center">
                    <Button
                        onClick={handleSubmit}
                        size="md"
                        loading={loading}
                    >
                        {loading ? 'Calculating...' : 'Calculate Ratings'}
                    </Button>
                </div>

                {error && (
                    <div className="mt-4 text-red-500 text-center">
                        {error}
                    </div>
                )}

                <AnalysisResults
                    analysis={analysis}
                    getFullImpairmentCode={getFullImpairmentCode}
                    isDark={isDark}
                />
            </div>
        </Container>
    );
};

export default RateReports;
