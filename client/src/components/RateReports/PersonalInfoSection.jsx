import React from 'react';
import { Paper, TextInput, Checkbox, Grid, Group, Text } from '@mantine/core';

const PersonalInfoSection = ({ formData, handleInputChange }) => {
    return (
        <Paper p="md" radius="md" withBorder>
            <Grid>
                <Grid.Col span={6}>
                    <TextInput
                        label="Date of Birth (mm/dd/yyyy)"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={(e) => handleInputChange({ target: { name: 'dateOfBirth', value: e.target.value } })}
                        placeholder="01/01/1976"
                    />
                </Grid.Col>
                <Grid.Col span={6}>
                    <TextInput
                        label="Date of Injury (mm/dd/yyyy)"
                        name="dateOfInjury"
                        value={formData.dateOfInjury}
                        onChange={(e) => handleInputChange({ target: { name: 'dateOfInjury', value: e.target.value } })}
                        placeholder="01/01/2006"
                    />
                </Grid.Col>
                <Grid.Col span={6}>
                    <TextInput
                        label="Age at DOI"
                        name="age"
                        value={formData.age}
                        onChange={(e) => handleInputChange({ target: { name: 'age', value: e.target.value } })}
                        placeholder="30"
                    />
                </Grid.Col>
                <Grid.Col span={6}>
                    <TextInput
                        label="Weekly Earnings"
                        name="weeklyEarnings"
                        value={formData.weeklyEarnings}
                        onChange={(e) => handleInputChange({ target: { name: 'weeklyEarnings', value: e.target.value } })}
                    />
                    <Group mt="xs">
                        <Checkbox
                            label="Max Earnings"
                            name="maxEarnings"
                            checked={formData.maxEarnings}
                            onChange={(e) => handleInputChange({
                                target: {
                                    name: 'maxEarnings',
                                    type: 'checkbox',
                                    checked: e.currentTarget.checked
                                }
                            })}
                        />
                    </Group>
                </Grid.Col>
                <Grid.Col span={12}>
                    <TextInput
                        label="Evaluator Name"
                        name="evaluatorName"
                        value={formData.evaluatorName}
                        onChange={(e) => handleInputChange({ target: { name: 'evaluatorName', value: e.target.value } })}
                    />
                </Grid.Col>
            </Grid>
        </Paper>
    );
};

export default PersonalInfoSection;
