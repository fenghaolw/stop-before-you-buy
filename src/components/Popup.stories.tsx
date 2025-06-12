import type { Meta, StoryObj } from '@storybook/preact-vite';
import { Popup } from './Popup';

const meta: Meta<typeof Popup> = {
    title: 'Components/Popup',
    component: Popup,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Popup>;

export const Default: Story = {
    args: {
        initialLibraries: {
            steam: [
                { id: '1', title: 'The Witcher 3', platform: 'steam' },
                { id: '2', title: 'Cyberpunk 2077', platform: 'steam' },
            ],
            epic: [
                { id: '3', title: 'Red Dead Redemption 2', platform: 'epic' },
            ],
            gog: [
                { id: '4', title: 'Baldur\'s Gate 3', platform: 'gog' },
            ],
        },
        initialSettings: {
            enableNotifications: true,
            autoSync: true,
        },
    },
};

export const EmptyLibraries: Story = {
    args: {
        initialLibraries: {
            steam: [],
            epic: [],
            gog: [],
        },
        initialSettings: {
            enableNotifications: true,
            autoSync: true,
        },
    },
};

export const NotificationsDisabled: Story = {
    args: {
        initialLibraries: {
            steam: [
                { id: '1', title: 'The Witcher 3', platform: 'steam' },
            ],
            epic: [],
            gog: [],
        },
        initialSettings: {
            enableNotifications: false,
            autoSync: true,
        },
    },
}; 