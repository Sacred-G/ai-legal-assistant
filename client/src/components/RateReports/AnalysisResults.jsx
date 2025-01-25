import React from 'react';
import { Paper, Title, Table, Grid, Text, Textarea } from '@mantine/core';

const AnalysisResults = ({ analysis, getFullImpairmentCode, isDark }) => {
    if (!analysis) return null;

    return (
        <Paper p="md" radius="md" withBorder className="h-[calc(100vh-24rem)] overflow-auto">
            <Title order={2} mb="md">Analysis Results</Title>

            {/* No Apportionment Section */}
            <div className="mb-6">
                <Title order={3} mb="sm">NO APPORTIONMENT {analysis.no_apportionment.total}%</Title>
                <Table striped highlightOnHover>
                    <tbody>
                        {analysis.no_apportionment.sections.map((section, index) => (
                            <tr key={index}>
                                <td>
                                    <Text family="monospace">{getFullImpairmentCode(section.code)}</Text>
                                </td>
                                <td>{section.description}</td>
                                <td style={{ textAlign: 'right' }}>{section.rating}%</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>

                {/* Comments Section */}
                <Paper p="md" radius="md" withBorder mt="lg">
                    <Title order={4} mb="sm">Comments</Title>
                    <Textarea
                        placeholder="Enter comments here"
                        minRows={4}
                    />
                </Paper>

                {/* PD Combinations Section */}
                <Paper p="md" radius="md" withBorder mt="lg">
                    <Title order={4} mb="sm">PD of same extremity regions combined:</Title>
                    <Grid>
                        <Grid.Col span={6}>
                            <Text>17 Combined PD Left - 50</Text>
                        </Grid.Col>
                        <Grid.Col span={6}>
                            <Text>16 Combined PD Right - 32</Text>
                        </Grid.Col>
                    </Grid>
                    <Text mt="md" weight={500}>Final Combined PD: 71</Text>
                </Paper>
            </div>

            {/* With Apportionment Section */}
            <div className="mb-6">
                <Title order={3} mb="sm">WITH APPORTIONMENT {analysis.with_apportionment.total}%</Title>
                <Table striped highlightOnHover>
                    <tbody>
                        {analysis.with_apportionment.sections.map((section, index) => (
                            <tr key={index}>
                                <td>
                                    <Text family="monospace">{getFullImpairmentCode(section.code)}</Text>
                                </td>
                                <td>{section.description}</td>
                                <td style={{ textAlign: 'right' }}>{section.rating}%</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>

            {/* Financial Details */}
            <Grid>
                <Grid.Col span={6}>
                    <Text mb="xs"><b>Weekly Earnings:</b> ${analysis.weekly_earnings.toFixed(2)}</Text>
                    <Text mb="xs"><b>PD Weekly Rate:</b> ${analysis.pd_weekly_rate.toFixed(2)}</Text>
                    <Text mb="xs"><b>Total PD Payout:</b> ${analysis.total_pd_payout.toFixed(2)}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                    <Text mb="xs"><b>Life Weekly Rate:</b> ${analysis.life_weekly_rate.toFixed(2)}</Text>
                </Grid.Col>
            </Grid>
        </Paper>
    );
};

export default AnalysisResults;
