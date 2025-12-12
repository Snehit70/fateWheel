
export const getResultColor = (color) => {
    switch (color) {
        case 'red': return 'bg-red-500';
        case 'black': return 'bg-[#2d1f3d] shadow-[0_0_6px_rgba(138,43,226,0.3)]';
        case 'green': return 'bg-green-500';
        default: return 'bg-gray-500';
    }
};

export const getValueColor = (value) => {
    switch (value) {
        case 'red': return 'text-red-500 font-bold';
        case 'black': return 'text-purple-400 font-bold';
        case 'green': return 'text-green-500 font-bold';
        default: return '';
    }
};

export const getStatusColor = (status) => {
    switch (status) {
        case 'approved': return 'text-green-500 border-green-500/20 bg-green-500/10';
        case 'rejected': return 'text-red-500 border-red-500/20 bg-red-500/10';
        case 'pending': return 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10';
        default: return '';
    }
};
