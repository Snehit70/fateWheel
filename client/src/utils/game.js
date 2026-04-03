
export const getResultColor = (color) => {
    switch (color) {
        case 'red': return 'bg-ruby';
        case 'black': return 'bg-royal shadow-[0_0_6px_rgba(74,63,107,0.35)]';
        case 'green': return 'bg-emerald';
        default: return 'bg-surface-lighter';
    }
};

export const getValueColor = (value) => {
    switch (value) {
        case 'red': return 'text-ruby-light font-bold';
        case 'black': return 'text-cream font-bold';
        case 'green': return 'text-emerald font-bold';
        default: return '';
    }
};

export const getStatusColor = (status) => {
    switch (status) {
        case 'approved': return 'text-emerald border-emerald/20 bg-emerald/10';
        case 'rejected': return 'text-ruby-light border-ruby/20 bg-ruby/10';
        case 'pending': return 'text-gold border-gold/20 bg-gold/10';
        default: return '';
    }
};
