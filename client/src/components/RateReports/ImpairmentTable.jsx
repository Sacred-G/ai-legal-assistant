import React from 'react';
import { Paper, Table, Button, Text } from '@mantine/core';

const ImpairmentTable = ({ impairments, handleRemoveImpairment, getFullImpairmentCode }) => {
    return (
        <Paper p="md" radius="md" withBorder>
            <div className="overflow-x-auto">
                <Table striped highlightOnHover>
                    <thead>
                        <tr>
                            <th>Appt</th>
                            <th>Table</th>
                            <th>Impairment Code</th>
                            <th>Impairment Description</th>
                            <th>WPI</th>
                            <th>Pain</th>
                            <th>1.4FEC</th>
                            <th>OccupAdj</th>
                            <th>AgeAdj</th>
                            <th>Final PD</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {impairments.map(imp => (
                            <tr key={imp.id}>
                                <td>{imp.nonIndustrial} / {imp.industrial}</td>
                                <td></td>
                                <td>
                                    <Text size="sm" family="monospace">
                                        {getFullImpairmentCode(imp.impairment)}
                                    </Text>
                                </td>
                                <td>
                                    {imp.impairmentLabel ? (
                                        <>
                                            <Text size="sm">{imp.impairmentLabel.split('>')[0].trim()}</Text>
                                            <Text size="sm" color="dimmed">{imp.impairmentLabel.split('>')[1].trim()}</Text>
                                        </>
                                    ) : ''}
                                </td>
                                <td>{imp.wpi}</td>
                                <td>{imp.painMedication}</td>
                                <td>{imp.fec}</td>
                                <td>{imp.occupAdj}</td>
                                <td>{imp.ageAdj}</td>
                                <td>{imp.finalPD}</td>
                                <td>
                                    <Button
                                        onClick={() => handleRemoveImpairment(imp.id)}
                                        color="red"
                                        size="xs"
                                        variant="subtle"
                                    >
                                        Remove
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>

            <div className="flex justify-between items-center mt-4">
                <Button
                    variant="light"
                    color="green"
                    size="sm"
                >
                    View Report
                </Button>
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        name="addPD"
                        className="mr-2"
                    />
                    <Text size="sm">Add PD (Not using CVC)</Text>
                </div>
            </div>
        </Paper>
    );
};

export default ImpairmentTable;
