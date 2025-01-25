import React from 'react';
import { Paper, TextInput, Select, Checkbox, Grid, Button } from '@mantine/core';

const ImpairmentForm = ({ formData, handleInputChange, handleAddImpairment, impairmentOptions }) => {
    return (
        <Paper p="md" radius="md" withBorder>
            <Grid>
                <Grid.Col span={4}>
                    <div className="grid grid-cols-2 gap-2">
                        <TextInput
                            label="Non-Industrial"
                            name="nonIndustrial"
                            value={formData.nonIndustrial}
                            onChange={(e) => handleInputChange({ target: { name: 'nonIndustrial', value: e.target.value } })}
                            placeholder="0"
                        />
                        <TextInput
                            label="Industrial"
                            name="industrial"
                            value={formData.industrial}
                            onChange={(e) => handleInputChange({ target: { name: 'industrial', value: e.target.value } })}
                            placeholder="100"
                        />
                    </div>
                </Grid.Col>

                <Grid.Col span={8}>
                    <Select
                        label="Impairment"
                        name="selectedImpairment"
                        value={formData.selectedImpairment}
                        onChange={(value) => handleInputChange({ target: { name: 'selectedImpairment', value } })}
                        data={[
                            { value: '', label: '----- Select Impairment -----' },
                            ...impairmentOptions.map(imp => {
                                const parts = imp.label.split('>');
                                const codeSection = parts[0].trim();
                                const description = parts[1].trim();
                                const code = codeSection.match(/\d+$/)[0];
                                return {
                                    value: imp.label,
                                    label: `${code.padEnd(5)} | ${description}`
                                };
                            })
                        ]}
                        searchable
                        clearable
                        style={{ minWidth: "600px" }}
                    />
                </Grid.Col>

                <Grid.Col span={2}>
                    <Checkbox
                        label="AG"
                        name="ag"
                        checked={formData.ag}
                        onChange={(e) => handleInputChange({
                            target: {
                                name: 'ag',
                                type: 'checkbox',
                                checked: e.currentTarget.checked
                            }
                        })}
                    />
                </Grid.Col>

                <Grid.Col span={2}>
                    <TextInput
                        label="WPI"
                        name="wpi"
                        value={formData.wpi}
                        onChange={(e) => handleInputChange({ target: { name: 'wpi', value: e.target.value } })}
                    />
                </Grid.Col>

                <Grid.Col span={4}>
                    <Select
                        label="Left/Right"
                        name="leftRight"
                        value={formData.leftRight}
                        onChange={(value) => handleInputChange({ target: { name: 'leftRight', value } })}
                        data={[
                            { value: 'None', label: 'None' },
                            { value: 'Left', label: 'Left' },
                            { value: 'Right', label: 'Right' }
                        ]}
                    />
                </Grid.Col>

                <Grid.Col span={4}>
                    <TextInput
                        label="Pain/Medication"
                        name="painMedication"
                        value={formData.painMedication}
                        onChange={(e) => handleInputChange({ target: { name: 'painMedication', value: e.target.value } })}
                    />
                </Grid.Col>

                <Grid.Col span={12}>
                    <Button
                        onClick={handleAddImpairment}
                        variant="filled"
                        color="blue"
                        size="sm"
                    >
                        Add to Table
                    </Button>
                </Grid.Col>
            </Grid>
        </Paper>
    );
};

export default ImpairmentForm;
